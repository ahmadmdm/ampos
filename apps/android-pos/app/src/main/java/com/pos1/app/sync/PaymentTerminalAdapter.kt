package com.pos1.app.sync

interface PaymentTerminalAdapter {
    suspend fun startSale(amount: Double, currency: String, reference: String): TerminalResult
    suspend fun cancelSale(reference: String): TerminalResult
}

data class TerminalResult(
    val success: Boolean,
    val terminalTxnId: String?,
    val message: String?
)
