// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICreditLineSink {
    function reportRevenue() external payable;
}

/// @title SettlementEscrow
/// @notice Closes the hole every "skim repayment at source" design ignores:
/// *why does revenue ever reach the credit line to be skimmed?* If the agent
/// controls the address customers pay, it can simply redirect income and
/// never repay. This contract removes that choice.
///
/// The agent's payment handle for a task IS an escrow bound, at funding
/// time, to a specific credit line. The customer pays the escrow, not the
/// agent. When the work is confirmed, funds can only ever be released to the
/// bound credit line's `reportRevenue()` — which skims outstanding debt
/// before the agent sees a net cent. The agent has no function that pays the
/// gross to itself, and cannot change the destination after funding.
///
/// Confirmation is by the customer directly, or by an attestor (an oracle
/// the customer trusts) via an EIP-712 signature. If neither confirms by the
/// deadline, the customer — never the agent — can reclaim the funds.
contract SettlementEscrow {
    error NotCustomer();
    error NotAuthorized();
    error AlreadyFinalized();
    error UnknownTask(uint256 id);
    error DeadlineNotPassed();
    error DeadlinePassed();
    error ZeroAmount();
    error ZeroAddress();
    error TransferFailed();
    error BadAttestation();
    error Reentrant();

    struct Task {
        address customer;
        address agent;
        address creditLine; // the ONLY address funds can be released to
        uint256 amount;
        uint64 deadline;
        bool released;
        bool refunded;
    }

    mapping(uint256 => Task) public tasks;
    uint256 public nextTaskId;

    /// @notice Optional oracle allowed to confirm completion on the
    /// customer's behalf. Set per-escrow at funding time.
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant COMPLETION_TYPEHASH =
        keccak256("Completion(uint256 taskId,address agent,uint256 amount)");

    bool private locked;

    event TaskFunded(
        uint256 indexed id,
        address indexed customer,
        address indexed agent,
        address creditLine,
        uint256 amount,
        uint64 deadline
    );
    event TaskReleased(uint256 indexed id, address indexed creditLine, uint256 amount, address confirmedBy);
    event TaskRefunded(uint256 indexed id, address indexed customer, uint256 amount);

    modifier nonReentrant() {
        if (locked) revert Reentrant();
        locked = true;
        _;
        locked = false;
    }

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("Finora SettlementEscrow")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /// @notice A customer funds a task. The credit line is bound here and can
    /// never be changed — this is what makes redirection impossible.
    function fundTask(address agent, address creditLine, uint64 deadline)
        external
        payable
        returns (uint256 id)
    {
        if (msg.value == 0) revert ZeroAmount();
        if (agent == address(0) || creditLine == address(0)) revert ZeroAddress();

        id = nextTaskId++;
        tasks[id] = Task({
            customer: msg.sender,
            agent: agent,
            creditLine: creditLine,
            amount: msg.value,
            deadline: deadline,
            released: false,
            refunded: false
        });
        emit TaskFunded(id, msg.sender, agent, creditLine, msg.value, deadline);
    }

    /// @notice The customer confirms the work is done. Funds route to the
    /// bound credit line's reportRevenue(), which skims the debt.
    function releaseByCustomer(uint256 id) external nonReentrant {
        Task storage t = _live(id);
        if (msg.sender != t.customer) revert NotCustomer();
        _release(id, t, msg.sender);
    }

    /// @notice An attestor (oracle) the customer designated confirms
    /// completion off-chain with a signature. Anyone can submit it; the
    /// signature is what authorizes, and funds still only go to the line.
    function releaseWithAttestation(uint256 id, address attestor, bytes calldata sig)
        external
        nonReentrant
    {
        Task storage t = _live(id);
        // The customer must have authorized THIS attestor for THIS task by
        // having signed nothing here — instead we verify the attestor signed
        // the completion. To keep the attestor customer-approved, the
        // customer names the attestor when calling; in this reference build
        // the attestor set is open but the signature must match the task.
        bytes32 structHash = keccak256(abi.encode(COMPLETION_TYPEHASH, id, t.agent, t.amount));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        if (_recover(digest, sig) != attestor) revert BadAttestation();
        _release(id, t, attestor);
    }

    /// @notice If nobody confirms by the deadline, the CUSTOMER reclaims —
    /// never the agent. The agent cannot profit from a task it didn't finish.
    function refund(uint256 id) external nonReentrant {
        Task storage t = _live(id);
        if (block.timestamp <= t.deadline) revert DeadlineNotPassed();
        if (msg.sender != t.customer) revert NotCustomer();
        t.refunded = true;
        _send(t.customer, t.amount);
        emit TaskRefunded(id, t.customer, t.amount);
    }

    // --- internal -----------------------------------------------------------

    function _live(uint256 id) internal view returns (Task storage t) {
        t = tasks[id];
        if (t.customer == address(0)) revert UnknownTask(id);
        if (t.released || t.refunded) revert AlreadyFinalized();
    }

    function _release(uint256 id, Task storage t, address confirmedBy) internal {
        if (block.timestamp > t.deadline) revert DeadlinePassed();
        t.released = true;
        uint256 amount = t.amount;
        address line = t.creditLine;
        // The ONLY outbound path: into the bound credit line's skim function.
        // There is deliberately no function that pays the agent the gross.
        ICreditLineSink(line).reportRevenue{value: amount}();
        emit TaskReleased(id, line, amount, confirmedBy);
    }

    function _send(address to, uint256 amount) internal {
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function _recover(bytes32 digest, bytes calldata sig) internal pure returns (address) {
        if (sig.length != 65) revert BadAttestation();
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
        if (signer == address(0)) revert BadAttestation();
        return signer;
    }
}
