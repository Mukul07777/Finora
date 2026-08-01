// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentWallet
/// @notice A session-key smart wallet for an autonomous agent. The agent can
/// only move funds within an owner-defined policy (per-tx cap, rolling
/// daily cap, counterparty allowlist), and the owner can freeze the agent
/// instantly — including in the middle of a proposed multi-step payment.
/// None of these guarantees depend on the agent's own cooperation: every
/// check is a `require`/custom-error revert enforced by the EVM, not by
/// application logic the agent could talk its way around.
contract AgentWallet {
    // --- Errors -------------------------------------------------------

    error NotOwner();
    error NotPendingOwner();
    error NotAgent();
    error ContractPaused();
    error NotAllowlisted(address to);
    error ExceedsPerTxLimit(uint256 amount, uint256 limit);
    error ExceedsDailyLimit(uint256 amount, uint256 remaining);
    error PaymentAlreadyFinalized(uint256 id);
    error PaymentUnknown(uint256 id);
    error InsufficientBalance(uint256 amount, uint256 balance);
    error ZeroAddress();
    error Reentrant();

    // --- Storage --------------------------------------------------------

    address public owner;
    /// @notice Two-step ownership handoff target. Zero until a transfer is
    /// in progress. Keeps a typo'd or unreachable new owner from bricking
    /// the kill switch — the old owner stays in control until the new one
    /// actively accepts.
    address public pendingOwner;
    address public agent;

    bool public paused;
    bool private locked;

    uint256 public perTxLimit;
    uint256 public dailyLimit;
    uint256 public windowDuration = 1 days;

    uint256 public windowStart;
    uint256 public spentInWindow;

    mapping(address => bool) public allowlist;

    struct PendingPayment {
        address to;
        uint256 amount;
        bool executed;
        bool cancelled;
    }

    mapping(uint256 => PendingPayment) public pendingPayments;
    uint256 public nextPaymentId;

    // --- Events -----------------------------------------------------------

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AgentSet(address indexed agent);
    event PolicySet(uint256 perTxLimit, uint256 dailyLimit, uint256 windowDuration);
    event AllowlistUpdated(address indexed to, bool allowed);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event PaymentExecutedDirect(address indexed to, uint256 amount);
    event PaymentProposed(uint256 indexed id, address indexed to, uint256 amount);
    event PaymentExecuted(uint256 indexed id, address indexed to, uint256 amount);
    event PaymentCancelled(uint256 indexed id);

    // --- Modifiers --------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAgent() {
        if (msg.sender != agent) revert NotAgent();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    /// @notice Blocks re-entry into any external-call-making function.
    /// Belt-and-suspenders on top of the checks-effects-interactions
    /// ordering already used throughout (state is updated before every
    /// `.call{value: ...}`) — an allowlisted counterparty is trusted to
    /// receive funds, not trusted to be non-malicious code.
    modifier nonReentrant() {
        if (locked) revert Reentrant();
        locked = true;
        _;
        locked = false;
    }

    // --- Constructor --------------------------------------------------------

    constructor(address _agent, uint256 _perTxLimit, uint256 _dailyLimit) {
        owner = msg.sender;
        if (_agent != address(0)) {
            agent = _agent;
            emit AgentSet(_agent);
        }
        perTxLimit = _perTxLimit;
        dailyLimit = _dailyLimit;
        windowStart = block.timestamp;
        emit PolicySet(_perTxLimit, _dailyLimit, windowDuration);
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    // --- Owner controls -----------------------------------------------------

    /// @notice Step 1 of ownership transfer. The old owner keeps full
    /// control (including the kill switch) until `newOwner` calls
    /// `acceptOwnership()` — a single wrong address here can't strand
    /// the contract with an owner who never claims it.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    /// @notice Step 2 of ownership transfer. Only the proposed new owner
    /// can complete the handoff.
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    function setAgent(address _agent) external onlyOwner {
        if (_agent == address(0)) revert ZeroAddress();
        agent = _agent;
        emit AgentSet(_agent);
    }

    function setPolicy(uint256 _perTxLimit, uint256 _dailyLimit, uint256 _windowDuration) external onlyOwner {
        perTxLimit = _perTxLimit;
        dailyLimit = _dailyLimit;
        windowDuration = _windowDuration;
        emit PolicySet(_perTxLimit, _dailyLimit, _windowDuration);
    }

    function setAllowlist(address to, bool allowed) external onlyOwner {
        allowlist[to] = allowed;
        emit AllowlistUpdated(to, allowed);
    }

    /// @notice The kill switch. Freezes every spend path immediately —
    /// direct payments, proposals, and execution of already-proposed
    /// payments all revert until `unpause` is called again.
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        if (amount > address(this).balance) revert InsufficientBalance(amount, address(this).balance);
        (bool ok, ) = owner.call{value: amount}("");
        require(ok, "withdraw failed");
        emit Withdrawn(owner, amount);
    }

    // --- Agent spend path: direct (single step) ---------------------------

    /// @notice Single-step payment for normal, in-policy spending.
    function directPay(address to, uint256 amount) external onlyAgent whenNotPaused nonReentrant {
        _checkAllowlist(to);
        _checkPerTx(amount);
        _consumeDailyLimit(amount);
        _send(to, amount);
        emit PaymentExecutedDirect(to, amount);
    }

    // --- Agent spend path: two-step (propose -> execute) -------------------
    //
    // This is what makes in-flight revocation demonstrable: the owner can
    // pause() *after* a payment has been proposed but *before* it has been
    // executed, and the pending step will revert. No step beyond the point
    // of revocation can ever move funds.

    function proposePayment(address to, uint256 amount) external onlyAgent whenNotPaused returns (uint256 id) {
        _checkAllowlist(to);
        _checkPerTx(amount);

        id = nextPaymentId++;
        pendingPayments[id] = PendingPayment({to: to, amount: amount, executed: false, cancelled: false});
        emit PaymentProposed(id, to, amount);
    }

    function executePayment(uint256 id) external onlyAgent whenNotPaused nonReentrant {
        PendingPayment storage p = pendingPayments[id];
        if (p.to == address(0)) revert PaymentUnknown(id);
        if (p.executed || p.cancelled) revert PaymentAlreadyFinalized(id);

        // Re-validate at execution time — allowlist/limits may have
        // changed since the payment was proposed.
        _checkAllowlist(p.to);
        _checkPerTx(p.amount);
        _consumeDailyLimit(p.amount);

        p.executed = true;
        _send(p.to, p.amount);
        emit PaymentExecuted(id, p.to, p.amount);
    }

    function cancelPayment(uint256 id) external {
        if (msg.sender != owner && msg.sender != agent) revert NotOwner();
        PendingPayment storage p = pendingPayments[id];
        if (p.to == address(0)) revert PaymentUnknown(id);
        if (p.executed || p.cancelled) revert PaymentAlreadyFinalized(id);
        p.cancelled = true;
        emit PaymentCancelled(id);
    }

    // --- Internal ------------------------------------------------------------

    function _checkAllowlist(address to) internal view {
        if (to == address(0)) revert ZeroAddress();
        if (!allowlist[to]) revert NotAllowlisted(to);
    }

    function _checkPerTx(uint256 amount) internal view {
        if (amount > perTxLimit) revert ExceedsPerTxLimit(amount, perTxLimit);
    }

    function _consumeDailyLimit(uint256 amount) internal {
        if (block.timestamp >= windowStart + windowDuration) {
            windowStart = block.timestamp;
            spentInWindow = 0;
        }
        if (spentInWindow + amount > dailyLimit) {
            revert ExceedsDailyLimit(amount, dailyLimit - spentInWindow);
        }
        spentInWindow += amount;
    }

    function _send(address to, uint256 amount) internal {
        if (amount > address(this).balance) revert InsufficientBalance(amount, address(this).balance);
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
    }

    // --- Views --------------------------------------------------------------

    function remainingDailyLimit() external view returns (uint256) {
        if (block.timestamp >= windowStart + windowDuration) return dailyLimit;
        if (spentInWindow >= dailyLimit) return 0;
        return dailyLimit - spentInWindow;
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }
}
