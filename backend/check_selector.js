const { hash } = require("starknet");

const names = ["transfer", "approve", "stake", "mint", "burn", "execute", "__execute__", "upgrade", "deposit", "withdraw", "allowance", "balance_of", "enter_delegation_pool", "add_to_delegation_pool", "exit_delegation_pool_intent", "exit_delegation_pool_action", "claim_rewards", "contract_parameters", "get_pool_member_info"];

console.log("Selector map:");
names.forEach(name => {
  console.log(`${name}: ${hash.getSelectorFromName(name)}`);
});
