package com.pos1.app.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "local_events",
    indices = [Index(value = ["deviceId", "seq"], unique = true)]
)
data class LocalEventEntity(
    @PrimaryKey val id: String,
    val deviceId: String,
    val seq: Long,
    val type: String,
    val payloadJson: String,
    val createdAt: Long,
    val syncedAt: Long?,
    val hash: String
)
