// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ReputationRegistry
/// @notice Portable, on-chain reputation for autonomous agents. The score
/// is keyed to the agent's session-key address and is readable by *any*
/// lender — reputation earned working for one credit line is legible to
/// the next, so an agent isn't stuck cold-starting every relationship.
///
/// Two design choices matter here:
///  1. Scores are written only by *authorized reporters* (a CreditLine,
///     an AgentWallet, an off-chain underwriter the owner trusts). A raw
///     agent can never inflate its own score.
///  2. A brand-new agent can `inheritFrom` the principal (human/org) that
///     authorized it, importing that principal's standing at a haircut.
///     That's the honest answer to "no credit history": the human behind
///     the agent has history, even if the agent doesn't yet.
contract ReputationRegistry {
    error NotAdmin();
    error NotReporter();
    error AlreadyBootstrapped();

    struct Rep {
        uint32 score;          // 400..990 (divide by 10 for a 0-100 display)
        uint32 jobsCompleted;
        uint32 defaults;
        address principal;     // the human/org that authorized this agent
        bool bootstrapped;
    }

    uint32 public constant MIN_SCORE = 400;
    uint32 public constant MAX_SCORE = 990;
    uint32 public constant SEED_SCORE = 700; // fresh, un-inherited agents

    address public admin;
    mapping(address => bool) public isReporter;
    mapping(address => Rep) private _rep;
    mapping(address => uint32) public principalScore; // standing of a principal, aggregated across its agents

    event ReporterSet(address indexed reporter, bool allowed);
    event AgentBootstrapped(address indexed agent, address indexed principal, uint32 startScore);
    event ScoreChanged(address indexed agent, uint32 oldScore, uint32 newScore, string reason);
    event JobCompleted(address indexed agent, uint32 totalJobs);
    event Defaulted(address indexed agent, uint32 totalDefaults);

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyReporter() {
        if (!isReporter[msg.sender] && msg.sender != admin) revert NotReporter();
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function setReporter(address reporter, bool allowed) external onlyAdmin {
        isReporter[reporter] = allowed;
        emit ReporterSet(reporter, allowed);
    }

    /// @notice Register an agent, optionally inheriting its principal's
    /// standing at a discount. Callable once per agent.
    function bootstrap(address agent, address principal) external onlyReporter returns (uint32 startScore) {
        Rep storage r = _rep[agent];
        if (r.bootstrapped) revert AlreadyBootstrapped();

        if (principal != address(0) && principalScore[principal] > 0) {
            // Inherit at 85% of the principal's standing — the agent must
            // still earn the last 15% itself, but doesn't start from zero.
            uint32 inherited = uint32((uint256(principalScore[principal]) * 85) / 100);
            startScore = _clamp(inherited);
        } else {
            startScore = SEED_SCORE;
        }

        r.score = startScore;
        r.principal = principal;
        r.bootstrapped = true;
        emit AgentBootstrapped(agent, principal, startScore);
        emit ScoreChanged(agent, 0, startScore, "bootstrap");
    }

    function recordJobSuccess(address agent, uint32 points) external onlyReporter {
        Rep storage r = _rep[agent];
        _ensureInit(r);
        uint32 old = r.score;
        r.score = _clamp(old + points);
        r.jobsCompleted += 1;
        _bumpPrincipal(r.principal, r.score);
        emit JobCompleted(agent, r.jobsCompleted);
        emit ScoreChanged(agent, old, r.score, "job-success");
    }

    function recordRogueAttempt(address agent, uint32 penalty) external onlyReporter {
        Rep storage r = _rep[agent];
        _ensureInit(r);
        uint32 old = r.score;
        r.score = _clamp(old > penalty ? old - penalty : MIN_SCORE);
        emit ScoreChanged(agent, old, r.score, "rogue-attempt");
    }

    function recordDefault(address agent, uint32 penalty) external onlyReporter {
        Rep storage r = _rep[agent];
        _ensureInit(r);
        uint32 old = r.score;
        r.score = _clamp(old > penalty ? old - penalty : MIN_SCORE);
        r.defaults += 1;
        emit Defaulted(agent, r.defaults);
        emit ScoreChanged(agent, old, r.score, "default");
    }

    // --- Views ----------------------------------------------------------

    function scoreOf(address agent) external view returns (uint32) {
        Rep storage r = _rep[agent];
        return r.bootstrapped ? r.score : SEED_SCORE;
    }

    function repOf(address agent)
        external
        view
        returns (uint32 score, uint32 jobsCompleted, uint32 defaults, address principal, bool bootstrapped)
    {
        Rep storage r = _rep[agent];
        return (r.bootstrapped ? r.score : SEED_SCORE, r.jobsCompleted, r.defaults, r.principal, r.bootstrapped);
    }

    /// @notice Required bond ratio (in basis points of the credit limit)
    /// that the agent's principal must post as slashable collateral.
    /// Falls as reputation rises: trust substitutes for capital. A top-
    /// score agent posts 5%, a floor-score agent posts 60%.
    function bondRatioBps(address agent) public view returns (uint256) {
        uint32 s = _rep[agent].bootstrapped ? _rep[agent].score : SEED_SCORE;
        // linear: MIN_SCORE -> 6000 bps, MAX_SCORE -> 500 bps
        uint256 span = MAX_SCORE - MIN_SCORE;
        uint256 above = s <= MIN_SCORE ? 0 : (s >= MAX_SCORE ? span : s - MIN_SCORE);
        uint256 ratio = 6000 - (above * (6000 - 500)) / span;
        return ratio;
    }

    function _bumpPrincipal(address principal, uint32 agentScore) internal {
        if (principal == address(0)) return;
        if (agentScore > principalScore[principal]) {
            principalScore[principal] = agentScore;
        }
    }

    /// @notice Lazy-init: an agent that earns or loses reputation before an
    /// explicit bootstrap is treated as starting from the seed score, so
    /// writes are always reflected by scoreOf.
    function _ensureInit(Rep storage r) internal {
        if (!r.bootstrapped) {
            r.bootstrapped = true;
            r.score = SEED_SCORE;
        }
    }

    function _clamp(uint32 s) internal pure returns (uint32) {
        if (s < MIN_SCORE) return MIN_SCORE;
        if (s > MAX_SCORE) return MAX_SCORE;
        return s;
    }
}
