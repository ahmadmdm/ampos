package com.pos1.app.sync

class NoopReceiptPrinterAdapter : ReceiptPrinterAdapter {
    override suspend fun printReceipt(payload: String): PrintResult {
        return PrintResult(success = true, jobId = "receipt-demo", message = "Simulated receipt print")
    }

    override suspend fun printKitchenTicket(payload: String): PrintResult {
        return PrintResult(success = true, jobId = "kitchen-demo", message = "Simulated kitchen print")
    }
}
