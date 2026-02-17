package com.pos1.app.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import com.pos1.app.BuildConfig

/**
 * Encrypted SharedPreferences wrapper for secure storage.
 * Stores device tokens, JWT tokens, and configuration.
 */
class SecurePrefs(context: Context) {

    private val masterKey = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)

    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        "pos_secure_prefs",
        masterKey,
        context,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    // ── API Config ──
    var apiBaseUrl: String
        get() = prefs.getString(KEY_API_URL, BuildConfig.API_BASE_URL) ?: BuildConfig.API_BASE_URL
        set(value) = prefs.edit().putString(KEY_API_URL, value).apply()

    var branchId: String
        get() = prefs.getString(KEY_BRANCH_ID, BuildConfig.DEFAULT_BRANCH_ID) ?: BuildConfig.DEFAULT_BRANCH_ID
        set(value) = prefs.edit().putString(KEY_BRANCH_ID, value).apply()

    var organizationId: String
        get() = prefs.getString(KEY_ORG_ID, BuildConfig.DEFAULT_ORG_ID) ?: BuildConfig.DEFAULT_ORG_ID
        set(value) = prefs.edit().putString(KEY_ORG_ID, value).apply()

    var deviceCode: String
        get() = prefs.getString(KEY_DEVICE_CODE, BuildConfig.DEFAULT_DEVICE_CODE) ?: BuildConfig.DEFAULT_DEVICE_CODE
        set(value) = prefs.edit().putString(KEY_DEVICE_CODE, value).apply()

    // ── Device Auth ──
    var deviceId: String?
        get() = prefs.getString(KEY_DEVICE_ID, null)
        set(value) = prefs.edit().putString(KEY_DEVICE_ID, value).apply()

    var deviceToken: String?
        get() = prefs.getString(KEY_DEVICE_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_DEVICE_TOKEN, value).apply()

    // ── User Auth (JWT) ──
    var accessToken: String?
        get() = prefs.getString(KEY_ACCESS_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_ACCESS_TOKEN, value).apply()

    var refreshToken: String?
        get() = prefs.getString(KEY_REFRESH_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_REFRESH_TOKEN, value).apply()

    var userId: String?
        get() = prefs.getString(KEY_USER_ID, null)
        set(value) = prefs.edit().putString(KEY_USER_ID, value).apply()

    var userEmail: String?
        get() = prefs.getString(KEY_USER_EMAIL, null)
        set(value) = prefs.edit().putString(KEY_USER_EMAIL, value).apply()

    var userDisplayName: String?
        get() = prefs.getString(KEY_USER_NAME, null)
        set(value) = prefs.edit().putString(KEY_USER_NAME, value).apply()

    var userRoles: String?
        get() = prefs.getString(KEY_USER_ROLES, null)
        set(value) = prefs.edit().putString(KEY_USER_ROLES, value).apply()

    // ── Printer Config ──
    var printerIp: String
        get() = prefs.getString(KEY_PRINTER_IP, "192.168.1.100") ?: "192.168.1.100"
        set(value) = prefs.edit().putString(KEY_PRINTER_IP, value).apply()

    var printerPort: String
        get() = prefs.getString(KEY_PRINTER_PORT, "9100") ?: "9100"
        set(value) = prefs.edit().putString(KEY_PRINTER_PORT, value).apply()

    var paperWidth: String
        get() = prefs.getString(KEY_PAPER_WIDTH, "80") ?: "80"
        set(value) = prefs.edit().putString(KEY_PAPER_WIDTH, value).apply()

    var autoPrintReceipt: Boolean
        get() = prefs.getBoolean(KEY_AUTO_RECEIPT, true)
        set(value) = prefs.edit().putBoolean(KEY_AUTO_RECEIPT, value).apply()

    var autoPrintKitchen: Boolean
        get() = prefs.getBoolean(KEY_AUTO_KITCHEN, true)
        set(value) = prefs.edit().putBoolean(KEY_AUTO_KITCHEN, value).apply()

    var printLogo: Boolean
        get() = prefs.getBoolean(KEY_PRINT_LOGO, false)
        set(value) = prefs.edit().putBoolean(KEY_PRINT_LOGO, value).apply()

    // ── Snapshot Settings (from API) ──
    var taxRateBps: Int
        get() = prefs.getInt(KEY_TAX_RATE_BPS, 1500)
        set(value) = prefs.edit().putInt(KEY_TAX_RATE_BPS, value).apply()

    var serviceChargeBps: Int
        get() = prefs.getInt(KEY_SERVICE_CHARGE_BPS, 0)
        set(value) = prefs.edit().putInt(KEY_SERVICE_CHARGE_BPS, value).apply()

    val taxRate: Double get() = taxRateBps / 10000.0

    // ── Helpers ──
    val isLoggedIn: Boolean get() = !accessToken.isNullOrBlank()
    val isDeviceRegistered: Boolean get() = !deviceId.isNullOrBlank() && !deviceToken.isNullOrBlank()

    fun clearAuth() {
        prefs.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .remove(KEY_USER_ID)
            .remove(KEY_USER_EMAIL)
            .remove(KEY_USER_NAME)
            .remove(KEY_USER_ROLES)
            .apply()
    }

    fun clearAll() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val KEY_API_URL = "api_base_url"
        private const val KEY_BRANCH_ID = "branch_id"
        private const val KEY_ORG_ID = "org_id"
        private const val KEY_DEVICE_CODE = "device_code"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_USER_ROLES = "user_roles"
        private const val KEY_PRINTER_IP = "printer_ip"
        private const val KEY_PRINTER_PORT = "printer_port"
        private const val KEY_PAPER_WIDTH = "paper_width"
        private const val KEY_AUTO_RECEIPT = "auto_print_receipt"
        private const val KEY_AUTO_KITCHEN = "auto_print_kitchen"
        private const val KEY_PRINT_LOGO = "print_logo"
        private const val KEY_TAX_RATE_BPS = "tax_rate_bps"
        private const val KEY_SERVICE_CHARGE_BPS = "service_charge_bps"
    }
}
