package com.pos1.app.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface LocalEventDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(event: LocalEventEntity)

    @Query("SELECT * FROM local_events WHERE syncedAt IS NULL ORDER BY seq ASC LIMIT :limit")
    suspend fun getPending(limit: Int): List<LocalEventEntity>

    @Query("UPDATE local_events SET syncedAt = :syncedAt WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<String>, syncedAt: Long)

    @Query("SELECT COALESCE(MAX(seq), 0) FROM local_events WHERE deviceId = :deviceId")
    suspend fun getMaxSeq(deviceId: String): Long
}
