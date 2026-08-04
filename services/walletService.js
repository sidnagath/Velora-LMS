const User = require("../models/userModel");
const Wallet = require("../models/walletModel");



class WalletService{

async getWallet(id){

let wallet = await Wallet.findOne({ user: id });

if (!wallet) {
    wallet = await Wallet.create({
        user: id,
        balance: 0,
        transactions: []
    });
}

return {
    success: true,
    wallet
};
}


async creditWallet(id, amount, description, orderId) {
    try {
        let wallet = await Wallet.findOne({ user: id });

        if (!wallet) {
            wallet = await Wallet.create({
                user: id,
                balance: 0,
                transactions: []
            });
        }

        wallet.balance += amount;

        wallet.transactions.push({
            type: "credit",
            amount: amount,
            description: description || "Wallet credit",
            order: orderId
        });

        await wallet.save();
        return { success: true, message: "Wallet credited successfully", wallet };
    } catch (error) {
        console.error("Error crediting wallet:", error);
        return { success: false, message: "Failed to credit wallet" };
    }
}
}

module.exports= new WalletService();