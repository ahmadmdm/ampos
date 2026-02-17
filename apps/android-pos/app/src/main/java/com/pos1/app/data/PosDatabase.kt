package com.pos1.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [LocalEventEntity::class], version = 1, exportSchema = false)
abstract class PosDatabase : RoomDatabase() {
    abstract fun localEventDao(): LocalEventDao

    companion object {
        @Volatile private var INSTANCE: PosDatabase? = null

        fun get(context: Context): PosDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    PosDatabase::class.java,
                    "pos.db"
                ).build().also { INSTANCE = it }
            }
        }
    }
}
