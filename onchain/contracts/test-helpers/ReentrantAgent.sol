// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AgentWallet } from "../AgentWallet.sol";

/// @notice Test-only malicious agent: it is itself the allowlisted payment
/// destination, and its receive() hook tries to call directPay() again
/// while the outer call is still mid-flight. Proves nonReentrant actually
/// reverts the re-entry rather than merely relying on checks-effects-
/// interactions ordering to keep it in-policy.
contract ReentrantAgent {
    AgentWallet public wallet;
    bool public attacked;
    uint256 public reentryAttempts;

    constructor(AgentWallet _wallet) {
        wallet = _wallet;
    }

    receive() external payable {
        if (!attacked) {
            attacked = true;
            reentryAttempts++;
            try wallet.directPay(address(this), 1) {
                // If this branch is ever reached, the reentrancy guard failed.
            } catch {}
        }
    }

    function attack(uint256 amount) external {
        wallet.directPay(address(this), amount);
    }
}
