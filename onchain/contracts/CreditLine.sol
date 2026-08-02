// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IReputationRegistry {
    function scoreOf(address agent) external view returns (uint32);
    function bondRatioBps(address agent) external view returns (uint256);
    function recordJobSuccess(address agent, uint32 points) external;
    function recordDefault(address agent, uint32 penalty) external;
}

/// @title CreditLine
/// @notice Undercollateralized working-capital credit for an autonomous
/// agent, with repayment enforced *at the point revenue arrives* rather
/// than assumed. This is the piece that answers "how is repayment actually
/// recovered, not just hoped for":
///
///   - A lender funds the pool.
///   - The agent's *principal* (the human/org that authorized it) posts a
///     slashable bond, sized by the agent's on-chain reputation. Better
///     reputation -> smaller bond. That's the collateral substitute when
///     the agent itself can pledge nothing.
///   - The agent draws down capital up to a reputation-derived limit.
///   - Task revenue is routed INTO this contract. Before the agent can
///     touch a single wei of that revenue, outstanding principal + accrued
///     interest is skimmed off the top. The agent only ever sees net.
///   - If the agent goes silent / defaults, the lender slashes the bond
///     to make itself whole, and reputation takes the hit on-chain.
///
/// The agent never handles gross revenue, so it can't "forget" to repay —
/// repayment isn't a promise the agent keeps, it's a deduction it can't
/// route around.
contract CreditLine {
    error NotLender();
    error NotAgent();
    error NotPrincipal();
    error AlreadyOpen();
    error NotOpen();
    error BondTooSmall(uint256 required, uint256 provided);
    error ExceedsLimit(uint256 requested, uint256 available);
    error NothingWithdrawable();
    error TransferFailed();
    error StillIndebted(uint256 outstanding);
    error Reentrant();

    address public immutable lender;
    address public immutable agent;
    address public immutable principal;
    IReputationRegistry public immutable reputation;

    uint256 public immutable baseLimit;   // notional ceiling before reputation scaling
    uint256 public aprBps;                // annualized interest, basis points

    bool public open;
    bool private locked;

    uint256 public poolBalance;      // lender capital available to draw
    uint256 public bond;             // principal's slashable collateral
    uint256 public drawn;            // principal currently owed
    uint256 public accrued;          // interest accrued but not yet skimmed
    uint256 public lastAccrualTs;

    uint256 public revenueNet;       // agent-withdrawable balance (post-skim)

    event PoolFunded(address indexed lender, uint256 amount);
    event BondPosted(address indexed principal, uint256 amount);
    event DrawnDown(address indexed agent, uint256 amount, uint256 outstanding);
    event RevenueReceived(uint256 gross, uint256 skimmed, uint256 net);
    event Repaid(uint256 amount, uint256 remainingOutstanding);
    event NetWithdrawn(address indexed agent, uint256 amount);
    event Defaulted(address indexed agent, uint256 slashed, uint256 shortfall);
    event Closed();

    modifier onlyLender() { if (msg.sender != lender) revert NotLender(); _; }
    modifier onlyAgent() { if (msg.sender != agent) revert NotAgent(); _; }
    modifier onlyPrincipal() { if (msg.sender != principal) revert NotPrincipal(); _; }
    modifier nonReentrant() { if (locked) revert Reentrant(); locked = true; _; locked = false; }

    constructor(
        address _lender,
        address _agent,
        address _principal,
        address _reputation,
        uint256 _baseLimit,
        uint256 _aprBps
    ) {
        lender = _lender;
        agent = _agent;
        principal = _principal;
        reputation = IReputationRegistry(_reputation);
        baseLimit = _baseLimit;
        aprBps = _aprBps;
        lastAccrualTs = block.timestamp;
    }

    // --- Funding & bond -------------------------------------------------

    function fundPool() external payable onlyLender {
        poolBalance += msg.value;
        emit PoolFunded(lender, msg.value);
    }

    /// @notice The principal posts slashable collateral. Reputation sets
    /// how much is required: `requiredBond()` shrinks as the agent's score
    /// climbs. This is the only step where a human puts real skin in.
    function postBond() external payable onlyPrincipal {
        bond += msg.value;
        emit BondPosted(principal, bond);
    }

    /// @notice Opens the line once the bond covers the reputation-scaled
    /// requirement. Enforces the collateral floor before any drawdown.
    function activate() external onlyPrincipal {
        if (open) revert AlreadyOpen();
        uint256 required = requiredBond();
        if (bond < required) revert BondTooSmall(required, bond);
        open = true;
    }

    // --- Credit sizing (reputation-derived, live) -----------------------

    /// @notice The live credit limit: baseLimit scaled by the agent's
    /// current on-chain score. A 700 score gets ~70% of base; a 990 gets
    /// the full amount. Recomputed on every read, never frozen.
    function creditLimit() public view returns (uint256) {
        uint256 s = reputation.scoreOf(agent); // 400..990
        return (baseLimit * s) / 1000;
    }

    function requiredBond() public view returns (uint256) {
        uint256 ratio = reputation.bondRatioBps(agent); // 500..6000
        return (creditLimit() * ratio) / 10_000;
    }

    function outstanding() public view returns (uint256) {
        return drawn + accrued + _pendingInterest();
    }

    function available() public view returns (uint256) {
        uint256 limit = creditLimit();
        uint256 owed = outstanding();
        if (owed >= limit) return 0;
        uint256 headroom = limit - owed;
        return headroom < poolBalance ? headroom : poolBalance;
    }

    // --- Drawdown -------------------------------------------------------

    function drawdown(uint256 amount) external onlyAgent nonReentrant {
        if (!open) revert NotOpen();
        _accrue();
        uint256 avail = available();
        if (amount > avail) revert ExceedsLimit(amount, avail);

        poolBalance -= amount;
        drawn += amount;
        (bool ok, ) = agent.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit DrawnDown(agent, amount, outstanding());
    }

    // --- Repayment: skimmed at source -----------------------------------
    //
    // Revenue for completed tasks is sent here (by the payer, or routed by
    // the AgentWallet). We deduct what's owed BEFORE crediting the agent.
    // The agent's withdrawable balance is always net of debt.

    receive() external payable {
        _absorbRevenue(msg.value);
    }

    /// @notice Explicit entrypoint for revenue with an event, and the one
    /// the demo calls so the skim is legible on-chain.
    function reportRevenue() external payable {
        _absorbRevenue(msg.value);
    }

    function _absorbRevenue(uint256 gross) internal {
        _accrue();
        uint256 remaining = gross;
        uint256 skimmed = 0;

        // Interest first, then principal — standard amortization order.
        if (accrued > 0 && remaining > 0) {
            uint256 payInt = remaining < accrued ? remaining : accrued;
            accrued -= payInt;
            remaining -= payInt;
            skimmed += payInt;
            poolBalance += payInt; // interest flows back to the lender pool
        }
        if (drawn > 0 && remaining > 0) {
            uint256 payPrin = remaining < drawn ? remaining : drawn;
            drawn -= payPrin;
            remaining -= payPrin;
            skimmed += payPrin;
            poolBalance += payPrin; // principal returns to the pool
        }

        revenueNet += remaining; // only the leftover is the agent's to keep
        emit RevenueReceived(gross, skimmed, remaining);
        if (skimmed > 0) emit Repaid(skimmed, outstanding());
    }

    /// @notice Agent withdraws only its net (post-repayment) revenue.
    function withdrawNet() external onlyAgent nonReentrant {
        uint256 amt = revenueNet;
        if (amt == 0) revert NothingWithdrawable();
        revenueNet = 0;
        (bool ok, ) = agent.call{value: amt}("");
        if (!ok) revert TransferFailed();
        emit NetWithdrawn(agent, amt);
    }

    // --- Default handling -----------------------------------------------

    /// @notice If the agent leaves debt unpaid, the lender slashes the
    /// bond to recover, and the default is written to on-chain reputation
    /// so every future lender sees it.
    function declareDefault() external onlyLender nonReentrant {
        _accrue();
        uint256 owed = outstanding();
        if (owed == 0) revert StillIndebted(0);

        uint256 slash = bond < owed ? bond : owed;
        bond -= slash;
        uint256 shortfall = owed - slash;

        drawn = 0;
        accrued = 0;
        open = false;

        if (slash > 0) {
            (bool ok, ) = lender.call{value: slash}("");
            if (!ok) revert TransferFailed();
        }
        reputation.recordDefault(agent, 200); // heavy, portable reputation hit
        emit Defaulted(agent, slash, shortfall);
    }

    /// @notice Clean close: no debt outstanding, principal reclaims bond.
    function closeAndReclaim() external onlyPrincipal nonReentrant {
        _accrue();
        uint256 owed = outstanding();
        if (owed != 0) revert StillIndebted(owed);
        open = false;
        uint256 refund = bond;
        bond = 0;
        if (refund > 0) {
            (bool ok, ) = principal.call{value: refund}("");
            if (!ok) revert TransferFailed();
        }
        reputation.recordJobSuccess(agent, 15); // clean repayment builds standing
        emit Closed();
    }

    // --- Interest accrual ------------------------------------------------

    function _pendingInterest() internal view returns (uint256) {
        if (drawn == 0) return 0;
        uint256 dt = block.timestamp - lastAccrualTs;
        return (drawn * aprBps * dt) / (10_000 * 365 days);
    }

    function _accrue() internal {
        uint256 pending = _pendingInterest();
        if (pending > 0) accrued += pending;
        lastAccrualTs = block.timestamp;
    }
}
