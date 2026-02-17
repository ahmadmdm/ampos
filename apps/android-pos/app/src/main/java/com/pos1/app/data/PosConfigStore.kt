package com.pos1.app.data

import android.content.Context
import com.pos1.app.BuildConfig

data class PosConfig(
    val apiBaseUrl: String,
    val branchId: String,
    val organizationId: String,
    val deviceCode: String,
    val deviceId: String?,
    val deviceToken: String?
)

class PosConfigStore(context: Context) {
    private val prefs = context.getSharedPreferences("pos_config", Context.MODE_PRIVATE)

    fun load(): PosConfig {
        return PosConfig(
            apiBaseUrl = prefs.getString("apiBaseUrl", BuildConfig.API_BASE_URL) ?: BuildConfig.API_BASE_URL,
            branchId = prefs.getString("branchId", BuildConfig.DEFAULT_BRANCH_ID) ?: BuildConfig.DEFAULT_BRANCH_ID,
            organizationId = prefs.getString("organizationId", BuildConfig.DEFAULT_ORG_ID) ?: BuildConfig.DEFAULT_ORG_ID,
            deviceCode = prefs.getString("deviceCode", BuildConfig.DEFAULT_DEVICE_CODE) ?: BuildConfig.DEFAULT_DEVICE_CODE,
            deviceId = prefs.getString("deviceId", null),
            deviceToken = prefs.getString("deviceToken", null)
        )
    }

    fun save(input: PosConfig) {
        prefs.edit()
            .putString("apiBaseUrl", input.apiBaseUrl)
            .putString("branchId", input.branchId)
            .putString("organizationId", input.organizationId)
            .putString("deviceCode", input.deviceCode)
            .putString("deviceId", input.deviceId)
            .putString("deviceToken", input.deviceToken)
            .apply()
    }

    fun saveDeviceCredentials(deviceId: String, deviceToken: String) {
        prefs.edit()
            .putString("deviceId", deviceId)
            .putString("deviceToken", deviceToken)
            .apply()
    }
}
