import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano,
} from '@ton/core';

export type JettonMinterStakingContent = {
    type: 0 | 1;
    uri: string;
};

export type JettonMinterStakingConfig = {
    admin: Address;
    content: Cell;
    wallet_code: Cell;
    state: number;
    price: bigint;
};

export function jettonMinterConfigToCell(
    config: JettonMinterStakingConfig
): Cell {
    return beginCell()
        .storeCoins(0)
        .storeBit(config.state)
        .storeUint(config.price, 64)
        .storeCoins(1000000000)
        .storeAddress(config.admin)
        .storeAddress(config.admin)
        .storeRef(config.content)
        .storeRef(config.wallet_code)
        .endCell();
}

export function jettonContentToCell(content: JettonMinterStakingContent) {
    return beginCell()
        .storeUint(content.type, 8)
        .storeStringTail(content.uri) //Snake logic under the hood
        .endCell();
}

export class JettonMinterStaking implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell }
    ) {}

    static createFromAddress(address: Address) {
        return new JettonMinterStaking(address);
    }

    static createFromConfig(
        config: JettonMinterStakingConfig,
        code: Cell,
        workchain = 0
    ) {
        const data = jettonMinterConfigToCell(config);
        const init = { code, data };
        return new JettonMinterStaking(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }

    static mintMessage(
        to: Address,
        jetton_amount: bigint,
        forward_ton_amount: bigint,
        total_ton_amount: bigint
    ) {
        return beginCell()
            .storeUint(0x4fda1e51, 32)
            .storeUint(0, 64) // op, queryId
            .storeAddress(to)
            .storeCoins(jetton_amount)
            .storeCoins(forward_ton_amount)
            .storeCoins(total_ton_amount)
            .endCell();
    }

    async sendMint(
        provider: ContractProvider,
        via: Sender,
        to: Address,
        jetton_amount: bigint,
        forward_ton_amount: bigint,
        total_ton_amount: bigint
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinterStaking.mintMessage(
                to,
                jetton_amount,
                forward_ton_amount,
                total_ton_amount
            ),
            value: total_ton_amount + toNano('0.1'),
        });
    }

    static discoveryMessage(owner: Address, include_address: boolean) {
        return beginCell()
            .storeUint(0x2c76b973, 32)
            .storeUint(0, 64) // op, queryId
            .storeAddress(owner)
            .storeBit(include_address)
            .endCell();
    }

    async sendDiscovery(
        provider: ContractProvider,
        via: Sender,
        owner: Address,
        include_address: boolean,
        value: bigint = toNano('0.1')
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinterStaking.discoveryMessage(owner, include_address),
            value: value,
        });
    }

    static changeAdminMessage(newOwner: Address) {
        return beginCell()
            .storeUint(0x4840664f, 32)
            .storeUint(0, 64) // op, queryId
            .storeAddress(newOwner)
            .endCell();
    }

    async sendChangeAdmin(
        provider: ContractProvider,
        via: Sender,
        newOwner: Address
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinterStaking.changeAdminMessage(newOwner),
            value: toNano('0.1'),
        });
    }

    static changeWithdrawAddressMessage(newWithdrawAddress: Address) {
        return beginCell()
            .storeUint(0x4f9d828b, 32)
            .storeUint(0, 64) // op, queryId
            .storeAddress(newWithdrawAddress)
            .endCell();
    }

    async sendChangeWithdrawAddress(
        provider: ContractProvider,
        via: Sender,
        newWithdrawAddress: Address
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinterStaking.changeWithdrawAddressMessage(
                newWithdrawAddress
            ),
            value: toNano('0.1'),
        });
    }

    static changeContentMessage(content: Cell) {
        return beginCell()
            .storeUint(0x11067aba, 32)
            .storeUint(0, 64) // op, queryId
            .storeRef(content)
            .endCell();
    }

    async sendChangeContent(
        provider: ContractProvider,
        via: Sender,
        content: Cell
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinterStaking.changeContentMessage(content),
            value: toNano('0.1'),
        });
    }

    static stateMessage(state: boolean) {
        return beginCell()
            .storeUint(0x58ca5361, 32)
            .storeUint(0, 64) // op, queryId
            .storeBit(state)
            .endCell();
    }

    async sendChangeState(
        provider: ContractProvider,
        via: Sender,
        state: boolean
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinterStaking.stateMessage(state),
            value: toNano('0.2'),
        });
    }

    static withdrawMessage() {
        return beginCell()
            .storeUint(0x46ed2e94, 32)
            .storeUint(0, 64) // op, queryId
            .endCell();
    }

    async sendWithdraw(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinterStaking.withdrawMessage(),
            value: toNano('0.1'),
        });
    }

    static buyMessage() {
        return beginCell()
            .storeUint(0xc89a3ee4, 32)
            .storeUint(0, 64) // op, queryId
            .endCell();
    }

    async sendBuy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinterStaking.buyMessage(),
            value,
        });
    }

    static changePriceMessage(newPrice: bigint) {
        return beginCell()
            .storeUint(0xf4463799, 32)
            .storeUint(0, 64)
            .storeCoins(newPrice) // op, queryId
            .endCell();
    }

    async sendChangePrice(
        provider: ContractProvider,
        via: Sender,
        newPrice: bigint
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinterStaking.changePriceMessage(newPrice),
            value: toNano('0.2'),
        });
    }

    static changeWithdrawMessage(newWithdrawMinimum: bigint) {
        return beginCell()
            .storeUint(0x6f45070e, 32)
            .storeUint(0, 64)
            .storeCoins(newWithdrawMinimum) // op, queryId
            .endCell();
    }

    async sendChangeWithdraw(
        provider: ContractProvider,
        via: Sender,
        newWithdrawMinimum: bigint
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinterStaking.changeWithdrawMessage(newWithdrawMinimum),
            value: toNano('0.2'),
        });
    }

    async getWalletAddress(
        provider: ContractProvider,
        owner: Address
    ): Promise<Address> {
        const res = await provider.get('get_wallet_address', [
            { type: 'slice', cell: beginCell().storeAddress(owner).endCell() },
        ]);
        return res.stack.readAddress();
    }

    async getJettonData(provider: ContractProvider) {
        let res = await provider.get('get_jetton_data', []);
        let totalSupply = res.stack.readBigNumber();
        let mintable = res.stack.readBoolean();
        let adminAddress = res.stack.readAddress();
        let content = res.stack.readCell();
        let walletCode = res.stack.readCell();
        return {
            totalSupply,
            mintable,
            adminAddress,
            content,
            walletCode,
        };
    }

    async getTotalSupply(provider: ContractProvider) {
        let res = await this.getJettonData(provider);
        return res.totalSupply;
    }

    async getAdminAddress(provider: ContractProvider) {
        let res = await this.getJettonData(provider);
        return res.adminAddress;
    }

    async getContent(provider: ContractProvider) {
        let res = await this.getJettonData(provider);
        return res.content;
    }

    async getStakingData(provider: ContractProvider) {
        let res = await provider.get('get_staking_data', []);
        let state = res.stack.readBoolean();
        let price = res.stack.readBigNumber();
        return {
            state,
            price,
        };
    }

    async getWithdrawData(provider: ContractProvider) {
        let res = await provider.get('get_withdraw_data', []);
        let withdraw_minimum = res.stack.readBigNumber();
        let WithdrawAddress = res.stack.readAddress();
        return {
            withdraw_minimum,
            WithdrawAddress,
        };
    }

    async getWithdrawAddress(provider: ContractProvider) {
        let res = await this.getWithdrawData(provider);
        return res.WithdrawAddress;
    }

    async getWithdrawMinimum(provider: ContractProvider) {
        let res = await this.getWithdrawData(provider);
        return res.withdraw_minimum;
    }

    async getStakingState(provider: ContractProvider) {
        let res = await this.getStakingData(provider);
        return res.state;
    }

    async getStakingPrice(provider: ContractProvider) {
        let res = await this.getStakingData(provider);
        return res.price;
    }

    async getJettonAmount(provider: ContractProvider, value: bigint) {
        let res = await provider.get('get_jetton_amount', [
            { type: 'int', value },
        ]);
        return res.stack.readBigNumber();
    }
}
