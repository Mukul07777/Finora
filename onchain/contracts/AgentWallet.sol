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
    error NotGuardian();
    error AgentExpired();
    error NotMonitor();
    error GrantExpired();
    error GrantWrongAgent();
    error GrantExceeded(uint256 amount, uint256 max);
    error GrantAlreadyUsed(bytes32 digest);
    error BadSignature();

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

    // --- Guardians, dead-man switch, monitor (additive hardening) --------

    /// @notice Guardians can hit the kill switch but can never move funds.
    /// This removes the single-EOA objection: a compromised owner key is
    /// no longer the only thing standing between an agent and the money —
    /// any guardian can freeze it, and none of them can drain it.
    mapping(address => bool) public isGuardian;

    /// @notice Dead-man switch. If the owner doesn't `heartbeat()` within
    /// `heartbeatTimeout`, every spend path freezes automatically — an
    /// abandoned or unreachable owner can't leave an agent spending
    /// forever. 0 = disabled (default, so existing behavior is unchanged).
    uint256 public heartbeatTimeout;
    uint256 public lastHeartbeat;

    /// @notice An off-chain monitor may trip the breaker (pause) when it
    /// detects anomalous velocity — but, like a guardian, it can only
    /// freeze, never spend. Turns "real-time monitoring" from a dashboard
    /// that watches into a control that acts.
    address public monitor;

    // --- EIP-712 delegated spend grants ---------------------------------

    /// @notice A scoped, expiring capability the owner signs off-chain:
    /// "this agent may pay `to` up to `maxAmount`, until `expiry`, once
    /// per `nonce`." The contract verifies the owner's signature on-chain,
    /// so the agent's authority is a cryptographic delegation from the
    /// human — a verifiable owner->agent link, not a bare address.
    struct SpendGrant {
        address agent;
        address to;
        uint256 maxAmount;
        uint256 expiry;
        uint256 nonce;
    }

    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public constant GRANT_TYPEHASH =
        keccak256("SpendGrant(address agent,address to,uint256 maxAmount,uint256 expiry,uint256 nonce)");
    mapping(bytes32 => bool) public grantUsed;

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
    event GuardianSet(address indexed guardian, bool allowed);
    event MonitorSet(address indexed monitor);
    event HeartbeatConfigured(uint256 timeout);
    event Heartbeat(uint256 at);
    event CircuitBreakerTripped(address indexed by, uint256 risk);
    event GrantSpent(bytes32 indexed digest, address indexed to, uint256 amount);

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
        // Dead-man switch: if enabled and the owner has gone silent past
        // the timeout, the agent's spend authority auto-expires.
        if (heartbeatTimeout != 0 && block.timestamp > lastHeartbeat + heartbeatTimeout) {
            revert AgentExpired();
        }
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

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("Finora AgentWallet")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
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

    // --- Guardians & monitor (freeze-only roles) ------------------------

    function setGuardian(address guardian, bool allowed) external onlyOwner {
        if (guardian == address(0)) revert ZeroAddress();
        isGuardian[guardian] = allowed;
        emit GuardianSet(guardian, allowed);
    }

    /// @notice A guardian can engage the kill switch but never withdraw —
    /// so distributing guardian keys can't distribute the ability to steal.
    function guardianPause() external {
        if (!isGuardian[msg.sender]) revert NotGuardian();
        paused = true;
        emit Paused(msg.sender);
    }

    function setMonitor(address _monitor) external onlyOwner {
        monitor = _monitor;
        emit MonitorSet(_monitor);
    }

    /// @notice Automated circuit breaker. The monitor reports an assessed
    /// risk; at/above 80 (out of 100) the agent is frozen on-chain with no
    /// human in the loop. Monitoring that acts, not just observes.
    function tripBreaker(uint256 risk) external {
        if (msg.sender != monitor && msg.sender != owner) revert NotMonitor();
        if (risk >= 80) {
            paused = true;
            emit CircuitBreakerTripped(msg.sender, risk);
            emit Paused(msg.sender);
        }
    }

    // --- Dead-man switch -------------------------------------------------

    function setHeartbeat(uint256 timeout) external onlyOwner {
        heartbeatTimeout = timeout;
        lastHeartbeat = block.timestamp;
        emit HeartbeatConfigured(timeout);
    }

    function heartbeat() external onlyOwner {
        lastHeartbeat = block.timestamp;
        emit Heartbeat(block.timestamp);
    }

    function agentExpired() external view returns (bool) {
        return heartbeatTimeout != 0 && block.timestamp > lastHeartbeat + heartbeatTimeout;
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

    // --- Agent spend path: EIP-712 delegated grant ------------------------
    //
    // Instead of the owner pre-configuring the allowlist for every possible
    // counterparty, the owner can sign a one-off, scoped grant off-chain.
    // The agent submits it here; the contract recovers the signer and only
    // pays if the signer is the current owner. The agent's authority for
    // this payment is a verifiable cryptographic delegation from the human.

    function hashGrant(SpendGrant calldata g) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(GRANT_TYPEHASH, g.agent, g.to, g.maxAmount, g.expiry, g.nonce)
        );
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
    }

    function payWithGrant(SpendGrant calldata g, bytes calldata sig, uint256 amount)
        external
        onlyAgent
        whenNotPaused
        nonReentrant
    {
        if (block.timestamp > g.expiry) revert GrantExpired();
        if (g.agent != agent) revert GrantWrongAgent();
        if (amount > g.maxAmount) revert GrantExceeded(amount, g.maxAmount);

        bytes32 digest = hashGrant(g);
        if (grantUsed[digest]) revert GrantAlreadyUsed(digest);
        if (_recover(digest, sig) != owner) revert BadSignature();

        // Grant authorizes the counterparty directly; still subject to the
        // per-tx and daily caps — a signature can't buy past the ceilings.
        _checkPerTx(amount);
        _consumeDailyLimit(amount);

        grantUsed[digest] = true;
        _send(g.to, amount);
        emit GrantSpent(digest, g.to, amount);
        emit PaymentExecutedDirect(g.to, amount);
    }

    function _recover(bytes32 digest, bytes calldata sig) internal pure returns (address) {
        if (sig.length != 65) revert BadSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (v < 27) v += 27;
        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert BadSignature();
        return signer;
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
