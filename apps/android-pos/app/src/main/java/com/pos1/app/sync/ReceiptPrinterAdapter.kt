package com.pos1.app.sync

interface ReceiptPrinterAdapter {
    suspend fun printReceipt(payload: String): PrintResult
    suspend fun printKitchenTicket(payload: String): PrintResult
}

data class PrintResult(
    val success: Boolean,
    val jobId: String?,
    val message: String?
)
