package com.pos1.app.sync

class NoopPaymentTerminalAdapter : PaymentTerminalAdapter {
    override suspend fun startSale(amount: Double, currency: String, reference: String): TerminalResult {
        return TerminalResult(success = true, terminalTxnId = "demo-$reference", message = "Simulated terminal sale")
    }

    override suspend fun cancelSale(reference: String): TerminalResult {
        return TerminalResult(success = true, terminalTxnId = null, message = "Simulated cancel")
    }
}
