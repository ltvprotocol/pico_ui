start_test:
	tmux new -d -s "anvil_process" anvil --rpc-url $(RPC_MAINNET) --auto-impersonate && sed -i 's|https://ethereum-rpc\.publicnode\.com|http://localhost:8545|g' "src/constants.ts" && sleep 5 && cast send --from 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --value 1000 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --unlocked && cast send 0x5ded41f6414a5c1575d91d716aa3b2b9836d46fd --from 0x09a6F2f6Ea4871ed3D8E7002AeF6A5621e9650D3 "addAddressToWhitelist(address)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --unlocked

stop_test:
	tmux kill-session -t "anvil_process" | sed -i 's|http://localhost:8545|https://ethereum-rpc\.publicnode\.com|g' "src/constants.ts"