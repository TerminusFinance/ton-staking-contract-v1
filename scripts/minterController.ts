import { Address, beginCell, Cell, fromNano, OpenedContract, toNano, } from '@ton/core';
import { compile, sleep, NetworkProvider, UIProvider, } from '@ton/blueprint';
import { JettonMinterStaking, jettonContentToCell, } from '../wrappers/JettonMinterStaking';
import { promptBool, promptAmount, promptAddress, displayContentCell, waitForTransaction, promptUrl, } from '../wrappers/utils';
let minterStakingContract: OpenedContract<JettonMinterStaking>;

const adminActions = ['Mint', 'Change admin', 'Change content', 'Change state', 'Change price',  'Withdrawal', 'Change withdraw address', 'Change withdraw minimum'];
const userActions  = ['Stake', 'Info', 'Quit'];

const failedTransMessage = (ui: UIProvider) => {
    ui.write("Failed to get indication of transaction completion from API!\nCheck result manually, or try again\n");
};

const infoAction = async (provider: NetworkProvider, ui: UIProvider) => {
    const jettonData = await minterStakingContract.getJettonData();
    ui.write("Jetton info:\n\n");
    ui.write(`Admin: ${jettonData.adminAddress}\n`);
    ui.write(`Total supply: ${fromNano(jettonData.totalSupply)}\n`);
    ui.write(`Mintable: ${jettonData.mintable}\n`);
    const displayContent = await ui.choose('Display content?', ['Yes', 'No'], (c) => c);
    if (displayContent == 'Yes') {
        displayContentCell(jettonData.content, ui);
    }
    const displayFullInfo = await ui.choose('Display full info?', ['Yes', 'No'], (c) => c);
    if (displayFullInfo == 'Yes') {
        const StakingData = await minterStakingContract.getStakingData();
        ui.write("Staking info:\n\n");
        ui.write(`State: ${StakingData.state}\n`);
        ui.write(`Price: ${fromNano(StakingData.price)}\n`);
        const WithdrawData = await minterStakingContract.getWithdrawData();
        ui.write("_________________\n\nWithdraw info:\n\n");
        ui.write(`Withdraw address: ${WithdrawData.WithdrawAddress}\n`);
        ui.write(`Withdraw minimum: ${fromNano(WithdrawData.withdraw_minimum)} Ton\n`);
    }
};

const changeAdminAction = async (provider: NetworkProvider, ui: UIProvider) => {
    let retry: boolean;
    let newAdmin: Address;
    let curAdmin = await minterStakingContract.getAdminAddress();
    do {
        retry = false;
        newAdmin = await promptAddress('Please specify new admin address:', ui);
        if (newAdmin.equals(curAdmin)) {
            retry = true;
            ui.write("Address specified matched current admin address!\nPlease pick another one.\n");
        }
        else {
            ui.write(`New admin address is going to be: ${newAdmin}\nKindly double check it!\n`);
            retry = !(await promptBool('Is it ok?(yes/no)', ['yes', 'no'], ui));
        }
    } while (retry);

    const lastSeqno = (await provider.api().getLastBlock()).last.seqno;
    const curState = (await provider.api().getAccountLite(lastSeqno, minterStakingContract.address)).account;

    if (curState.last === null)
        throw ("Last transaction can't be null on deployed contract");

    await minterStakingContract.sendChangeAdmin(provider.sender(), newAdmin);
    const transDone = await waitForTransaction(provider,
        minterStakingContract.address,
        curState.last.lt,
        10);
    if (transDone) {
        const adminAfter = await minterStakingContract.getAdminAddress();
        if (adminAfter.equals(newAdmin)) {
            ui.write("Admin changed successfully");
        } else {
            ui.write("Admin address hasn't changed!\nSomething went wrong!\n");
        }
    } else {
        failedTransMessage(ui);
    }
};

const changeWithdrawAddressAction = async (provider: NetworkProvider, ui: UIProvider) => {
    let retry: boolean;
    let newWithdrawAddress: Address;
    let curWithdrawAddress = await minterStakingContract.getWithdrawAddress();
    do {
        retry = false;
        newWithdrawAddress = await promptAddress('Please specify new withdraw address:', ui);
        if (newWithdrawAddress.equals(curWithdrawAddress)) {
            retry = true;
            ui.write("Address specified matched current admin address!\nPlease pick another one.\n");
        }
        else {
            ui.write(`New admin address is going to be: ${newWithdrawAddress}\nKindly double check it!\n`);
            retry = !(await promptBool('Is it ok?(yes/no)', ['yes', 'no'], ui));
        }
    } while (retry);

    const lastSeqno = (await provider.api().getLastBlock()).last.seqno;
    const curState = (await provider.api().getAccountLite(lastSeqno, minterStakingContract.address)).account;

    if (curState.last === null)
        throw ("Last transaction can't be null on deployed contract");

    await minterStakingContract.sendChangeWithdrawAddress(provider.sender(), newWithdrawAddress);
    const transDone = await waitForTransaction(provider,
        minterStakingContract.address,
        curState.last.lt,
        10);
    if (transDone) {
        const withdrawAddressAfter = await minterStakingContract.getWithdrawAddress();
        if (withdrawAddressAfter.equals(newWithdrawAddress)) {
            ui.write("Withdraw address changed successfully");
        } else {
            ui.write("Withdraw address hasn't changed!\nSomething went wrong!\n");
        }
    } else {
        failedTransMessage(ui);
    }
};

const changeContentAction = async (provider: NetworkProvider, ui: UIProvider) => {
    let retry: boolean;
    let newContent: string;
    let curContent = await minterStakingContract.getContent();
    do {
        retry = false;
        newContent = await promptUrl('Please specify new content:', ui);
        if (curContent.equals(jettonContentToCell({ type: 1, uri: newContent }))) {
            retry = true;
            ui.write("URI specified matched current content!\nPlease pick another one.\n");
        } else {
            ui.write(`New content is going to be: ${newContent}\nKindly double check it!\n`);
            retry = !(await promptBool('Is it ok?(yes/no)', ['yes', 'no'], ui));
        }
    } while (retry);

    const lastSeqno = (await provider.api().getLastBlock()).last.seqno;
    const curState = (await provider.api().getAccountLite(lastSeqno, minterStakingContract.address)).account;

    if (curState.last === null)
        throw ("Last transaction can't be null on deployed contract");

    await minterStakingContract.sendChangeContent(provider.sender(), jettonContentToCell({ type: 1, uri: newContent }));
    const transDone = await waitForTransaction(provider,
        minterStakingContract.address,
        curState.last.lt,
        10);
    if (transDone) {
        const contentAfter = await minterStakingContract.getContent();
        if (contentAfter.equals(jettonContentToCell({ type: 1, uri: newContent }))) {
            ui.write("Content changed successfully");
        } else {
            ui.write("Content hasn't changed!\nSomething went wrong!\n");
        }
    } else {
        failedTransMessage(ui);
    }
};

const changeStateAction = async (provider: NetworkProvider, ui: UIProvider) => {
    let retry: boolean;
    let newStakingState: boolean;
    let curStakingState = await minterStakingContract.getStakingState();
    do {
        retry = false;
        newStakingState = await promptBool('Please specify new state, yes - pause, no - resume:', ['yes', 'no'], ui);
        if (curStakingState == newStakingState) {
            retry = true;
            ui.write("Staking state specified matched current state!\nPlease pick another one.\n");
        } else {
            ui.write(`New Staking state is going to be: ${newStakingState}\nKindly double check it!\n`);
            retry = !(await promptBool('Is it ok?(yes/no)', ['yes', 'no'], ui));
        }
    } while (retry);

    const lastSeqno = (await provider.api().getLastBlock()).last.seqno;
    const curState = (await provider.api().getAccountLite(lastSeqno, minterStakingContract.address)).account;

    if (curState.last === null)
        throw ("Last transaction can't be null on deployed contract");

    await minterStakingContract.sendChangeState(provider.sender(), newStakingState);
    const transDone = await waitForTransaction(provider,
        minterStakingContract.address,
        curState.last.lt,
        10);
    if (transDone) {
        const stateAfter = await minterStakingContract.getStakingState();
        if (stateAfter == newStakingState) {
            ui.write("Staking state changed successfully");
        } else {
            ui.write("Staking state hasn't changed!\nSomething went wrong!\n");
        }
    } else {
        failedTransMessage(ui);
    }
};

const mintAction = async (provider: NetworkProvider, ui: UIProvider) => {
    const sender = provider.sender();
    let retry: boolean;
    let mintAddress: Address;
    let mintAmount: string;
    let forwardAmount: string;

    do {
        retry = false;
        const fallbackAddr = sender.address ?? await minterStakingContract.getAdminAddress();
        mintAddress = await promptAddress(`Please specify address to mint to`, ui, fallbackAddr);
        mintAmount = await promptAmount('Please provide mint amount in decimal form:', ui);
        ui.write(`Mint ${mintAmount} tokens to ${mintAddress}\n`);
        retry = !(await promptBool('Is it ok?(yes/no)', ['yes', 'no'], ui));
    } while (retry);

    ui.write(`Minting ${mintAmount} to ${mintAddress}\n`);
    const supplyBefore = await minterStakingContract.getTotalSupply();
    const nanoMint = toNano(mintAmount);
    
    const lastSeqno = (await provider.api().getLastBlock()).last.seqno;
    const curState = (await provider.api().getAccountLite(lastSeqno, minterStakingContract.address)).account;

    if (curState.last === null)
        throw ("Last transaction can't be null on deployed contract");

    const res = await minterStakingContract.sendMint(sender,
        mintAddress,
        nanoMint,
        toNano('0.05'),
        toNano('0.1'));
    const gotTrans = await waitForTransaction(provider,
        minterStakingContract.address,
        curState.last.lt,
        10);
    if (gotTrans) {
        const supplyAfter = await minterStakingContract.getTotalSupply();
        if (supplyAfter == supplyBefore + nanoMint) {
            ui.write("Mint successfull!\nCurrent supply:" + fromNano(supplyAfter));
        }
        else {
            ui.write("Mint failed!");
        }
    }
    else {
        failedTransMessage(ui);
    }
}

const changePriceAction = async (provider: NetworkProvider, ui: UIProvider) => {
    const sender = provider.sender();
    let retry: boolean;
    let newPrice: string;
    let forwardAmount: string;

    do {
        retry = false;
        const fallbackAddr = sender.address ?? await minterStakingContract.getAdminAddress();
        newPrice = await promptAmount('Please provide new price in decimal form:', ui);
        ui.write(`Changing price to ${newPrice}.\n`);
        retry = !(await promptBool('Is it ok?(yes/no)', ['yes', 'no'], ui));
    } while (retry);

    ui.write(`Changing price to ${newPrice}\n`);
    const supplyBefore = await minterStakingContract.getTotalSupply();
    const nanoPrice = toNano(newPrice);
    
    const lastSeqno = (await provider.api().getLastBlock()).last.seqno;
    const curState = (await provider.api().getAccountLite(lastSeqno, minterStakingContract.address)).account;

    if (curState.last === null)
        throw ("Last transaction can't be null on deployed contract");

    const res = await minterStakingContract.sendChangePrice(sender,
        nanoPrice
    )
    const gotTrans = await waitForTransaction(provider,
        minterStakingContract.address,
        curState.last.lt,
        10);
    if (gotTrans) {
        const PriceAfter = await minterStakingContract.getStakingPrice();
        if (PriceAfter == nanoPrice) {
            ui.write("Changing successfull!\nCurrent price: " + fromNano(PriceAfter));
        }
        else {
            ui.write("Changing failed!");
        }
    }
    else {
        failedTransMessage(ui);
    }
}

const changeMinimumWithdrawAction = async (provider: NetworkProvider, ui: UIProvider) => {
    const sender = provider.sender();
    let retry: boolean;
    let newWithdraw: string;
    let forwardAmount: string;

    do {
        retry = false;
        const fallbackAddr = sender.address ?? await minterStakingContract.getAdminAddress();
        newWithdraw = await promptAmount('Please provide minimum withdraw amount in decimal form:', ui);
        ui.write(`Change minimum withdraw to ${newWithdraw}?\n`);
        retry = !(await promptBool('Is it ok?(yes/no)', ['yes', 'no'], ui));
    } while (retry);

    ui.write(`Changing minimum withdraw to ${newWithdraw}?\n`);
    const nanoMinimumWithdraw = toNano(newWithdraw);
    
    const lastSeqno = (await provider.api().getLastBlock()).last.seqno;
    const curState = (await provider.api().getAccountLite(lastSeqno, minterStakingContract.address)).account;

    if (curState.last === null)
        throw ("Last transaction can't be null on deployed contract");

    const res = await minterStakingContract.sendChangeWithdraw(sender, nanoMinimumWithdraw);
    const gotTrans = await waitForTransaction(provider,
        minterStakingContract.address,
        curState.last.lt,
        10);
    if (gotTrans) {
        const WithdrawAfter = await minterStakingContract.getWithdrawMinimum();
        if (WithdrawAfter == nanoMinimumWithdraw) {
            ui.write("Change successfull!\nCurrent minimum autowithdraw:" + fromNano(nanoMinimumWithdraw));
        }
        else {
            ui.write("Change failed!");
        }
    }
    else {
        failedTransMessage(ui);
    }
}
const StakingAction = async (provider: NetworkProvider, ui: UIProvider) => {
    const sender = provider.sender();
    let retry: boolean;
    let amountToBuy: string;

    do {
        retry = false;
        amountToBuy = await promptAmount('Please provide TON amount in decimal form:', ui);
        ui.write(`Buying on ${amountToBuy}\n`);
        retry = !(await promptBool('Is it ok?(yes/no)', ['yes', 'no'], ui));
    } while (retry);

    const supplyBefore = await minterStakingContract.getTotalSupply();
    const lastSeqno = (await provider.api().getLastBlock()).last.seqno;
    const curState = (await provider.api().getAccountLite(lastSeqno, minterStakingContract.address)).account;

    if (curState.last === null)
        throw ("Last transaction can't be null on deployed contract");

    const res = await minterStakingContract.sendBuy(sender, toNano(amountToBuy));
    const gotTrans = await waitForTransaction(provider,
        minterStakingContract.address,
        curState.last.lt,
        10);
    if (gotTrans) {
        const supplyAfter = await minterStakingContract.getTotalSupply();

        if (supplyAfter > supplyBefore) {
            ui.write("Staking successfull!\nYou have received:" + fromNano(supplyAfter - supplyBefore));
        }
        else {
            ui.write("Staking failed!");
        }
    }
    else {
        failedTransMessage(ui);
    }
}

const withdrawalAction = async (provider: NetworkProvider, ui: UIProvider) => {
    const sender = provider.sender();
    let retry: boolean;

    do {
        retry = false;
        retry = !(await promptBool('Is it ok to withdraw TON from staking on the admin wallet?(yes/no)', ['yes', 'no'], ui));
    } while (retry);

    const lastSeqno = (await provider.api().getLastBlock()).last.seqno;
    const curState = (await provider.api().getAccountLite(lastSeqno, minterStakingContract.address)).account;

    if (curState.last === null)
        throw ("Last transaction can't be null on deployed contract");

    const contractBalanceBefore = BigInt((await provider.api().getAccountLite(lastSeqno, minterStakingContract.address)).account.balance.coins);

    const res = await minterStakingContract.sendWithdraw(sender);
    const gotTrans = await waitForTransaction(provider,
        minterStakingContract.address,
        curState.last.lt,
        10);
    if (gotTrans) {
        const lastSeqno = (await provider.api().getLastBlock()).last.seqno;
        const contractBalanceAfter = BigInt((await provider.api().getAccountLite(lastSeqno, minterStakingContract.address)).account.balance.coins);

        if (contractBalanceAfter < contractBalanceBefore) {
            ui.write("Withdrawal successfull!\nYou have received:" + fromNano(contractBalanceBefore - contractBalanceAfter));
        } else {
            ui.write("Withdrawal failed!");
        }
    } else {
        failedTransMessage(ui);
    }
}

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const hasSender = sender.address !== undefined;
    const api = provider.api()
    const minterStakingCode = await compile('JettonMinterStaking');
    let done = false;
    let retry: boolean;
    let StakingAddress: Address;

    do {
        retry = false;
        StakingAddress = await promptAddress('Please enter staking address:', ui);
        const isContractDeployed = await provider.isContractDeployed(StakingAddress);
        if (!isContractDeployed) {
            retry = true;
            ui.write("This contract is not active!\nPlease use another address, or deploy it first");
        }
        else {
            const lastSeqno = (await api.getLastBlock()).last.seqno;
            const contractState = (await api.getAccount(lastSeqno, StakingAddress)).account.state as {
                data: string | null;
                code: string | null;
                type: "active";
            };
            if (!(Cell.fromBase64(contractState.code as string)).equals(minterStakingCode)) {
                ui.write("Contract code differs from the current contract version!\n");
                const resp = await ui.choose("Use address anyway", ["Yes", "No"], (c) => c);
                retry = resp == "No";
            }
        }
    } while (retry);

    minterStakingContract = provider.open(JettonMinterStaking.createFromAddress(StakingAddress));
    const isAdmin = hasSender ? (await minterStakingContract.getAdminAddress()).equals(sender.address) : true;
    let actionList: string[];
    if (isAdmin) {
        actionList = [...adminActions, ...userActions];
        ui.write("Current wallet is staking admin!\n");
    }
    else {
        actionList = userActions;
        ui.write("Current wallet is not admin!\nAvaliable actions restricted\n");
    }

    do {
        const action = await ui.choose("Pick action:", actionList, (c) => c);
        switch (action) {
            case 'Mint':
                await mintAction(provider, ui);
                break;
            case 'Stake':
                await StakingAction(provider, ui);
                break;
            case 'Withdrawal':
                await withdrawalAction(provider, ui);
                break;
            case 'Change admin':
                await changeAdminAction(provider, ui);
                break;
            case 'Change withdraw minimum':
                await changeMinimumWithdrawAction(provider, ui);
                break;
            case 'Change content':
                await changeContentAction(provider, ui);
                break;
            case 'Change state':
                await changeStateAction(provider, ui);
                break;
            case 'Change price':
                await changePriceAction(provider, ui);
                break;
            case 'Info':
                await infoAction(provider, ui);
                break;
            case 'Change withdraw address':
                await changeWithdrawAddressAction(provider, ui);
                break;
            case 'Quit':
                done = true;
                break;
        }
    } while (!done);
}