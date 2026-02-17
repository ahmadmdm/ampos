package com.pos1.app.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pos1.app.PosApplication
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray

data class KdsTicketUi(
    val id: String,
    val orderNo: String,
    val tableCode: String,
    val status: String,
    val elapsedMin: Long,
    val items: List<KdsTicketItemUi> = emptyList(),
    val station: String = "",
)

data class KdsTicketItemUi(
    val name: String,
    val qty: Int,
    val status: String,
    val station: String,
)

class KdsViewModel : ViewModel() {

    private val prefs = PosApplication.instance.securePrefs
    private val api = PosApplication.instance.apiClient

    var tickets by mutableStateOf(emptyList<KdsTicketUi>())
        private set
    var stations by mutableStateOf(listOf("الكل"))
        private set
    var selectedStation by mutableStateOf("الكل")
    var isLoading by mutableStateOf(false)
        private set

    fun refreshTickets() {
        viewModelScope.launch {
            runCatching {
                val result = withContext(Dispatchers.IO) {
                    api.getKdsTickets(prefs.branchId)
                }
                val data = result.optJSONArray("data") ?: JSONArray()
                val now = System.currentTimeMillis()
                val parsed = mutableListOf<KdsTicketUi>()
                val stationSet = mutableSetOf<String>()

                for (i in 0 until data.length()) {
                    val t = data.getJSONObject(i)
                    val order = t.optJSONObject("order")
                    val ms = runCatching {
                        java.time.Instant.parse(t.optString("createdAt")).toEpochMilli()
                    }.getOrDefault(now)

                    // Parse items
                    val itemsArr = t.optJSONArray("items") ?: JSONArray()
                    val items = mutableListOf<KdsTicketItemUi>()
                    var ticketStation = ""
                    for (j in 0 until itemsArr.length()) {
                        val item = itemsArr.getJSONObject(j)
                        val orderItem = item.optJSONObject("orderItem")
                        val station = item.optJSONObject("station")
                        val stationName = station?.optString("nameAr", "") ?: ""
                        if (stationName.isNotBlank()) {
                            stationSet.add(stationName)
                            if (ticketStation.isBlank()) ticketStation = stationName
                        }
                        items.add(
                            KdsTicketItemUi(
                                name = orderItem?.optString("itemNameAr", "عنصر") ?: "عنصر",
                                qty = orderItem?.optInt("qty", 1) ?: 1,
                                status = item.optString("status", "NEW"),
                                station = stationName,
                            )
                        )
                    }

                    parsed.add(
                        KdsTicketUi(
                            id = t.optString("id"),
                            orderNo = order?.optString("orderNo", "-") ?: "-",
                            tableCode = order?.optJSONObject("table")?.optString("code", "-") ?: "-",
                            status = t.optString("status", "NEW"),
                            elapsedMin = ((now - ms) / 60000).coerceAtLeast(0),
                            items = items,
                            station = ticketStation,
                        )
                    )
                }

                tickets = parsed
                stations = listOf("الكل") + stationSet.sorted()
            }
        }
    }

    fun updateTicketStatus(ticketId: String, status: String) {
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    api.updateTicketStatus(ticketId, status)
                }
                refreshTickets()
            }
        }
    }

    fun filteredTickets(status: String): List<KdsTicketUi> {
        return tickets.filter { ticket ->
            ticket.status == status &&
                    (selectedStation == "الكل" || ticket.station == selectedStation ||
                            ticket.items.any { it.station == selectedStation })
        }
    }
}
