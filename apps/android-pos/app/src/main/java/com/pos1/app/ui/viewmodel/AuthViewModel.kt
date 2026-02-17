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

class AuthViewModel : ViewModel() {

    private val prefs = PosApplication.instance.securePrefs
    private val api = PosApplication.instance.apiClient

    var email by mutableStateOf("")
    var password by mutableStateOf("")
    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set
    var isLoggedIn by mutableStateOf(prefs.isLoggedIn)
        private set

    fun login() {
        if (email.isBlank() || password.isBlank()) {
            errorMessage = "أدخل البريد الإلكتروني وكلمة المرور"
            return
        }
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            runCatching {
                val result = withContext(Dispatchers.IO) {
                    api.login(email.trim(), password.trim())
                }
                val data = result.optJSONObject("data") ?: error("استجابة غير صالحة")
                val user = data.optJSONObject("user") ?: error("بيانات المستخدم مفقودة")

                prefs.accessToken = data.getString("accessToken")
                prefs.refreshToken = data.getString("refreshToken")
                prefs.userId = user.getString("id")
                prefs.userEmail = user.getString("email")
                prefs.userDisplayName = user.optString("displayName", "")

                val roles = user.optJSONArray("roles")
                if (roles != null) {
                    val roleList = (0 until roles.length()).map { roles.getString(it) }
                    prefs.userRoles = roleList.joinToString(",")
                }

                val branches = user.optJSONArray("branchIds")
                if (branches != null && branches.length() > 0) {
                    prefs.branchId = branches.getString(0)
                }

                isLoggedIn = true
            }.onFailure {
                errorMessage = when {
                    it.message?.contains("INVALID_CREDENTIALS") == true -> "بيانات الدخول غير صحيحة"
                    it.message?.contains("NO_ROLES") == true -> "لا توجد صلاحيات لهذا الحساب"
                    it.message?.contains("NO_BRANCH") == true -> "لا يوجد فرع مخصص لهذا الحساب"
                    else -> "فشل تسجيل الدخول: ${it.message}"
                }
            }
            isLoading = false
        }
    }

    fun logout() {
        viewModelScope.launch {
            runCatching {
                val token = prefs.refreshToken
                if (!token.isNullOrBlank()) {
                    withContext(Dispatchers.IO) { api.logout(token) }
                }
            }
            prefs.clearAuth()
            isLoggedIn = false
            email = ""
            password = ""
        }
    }

    fun checkAuth(): Boolean {
        isLoggedIn = prefs.isLoggedIn
        return isLoggedIn
    }
}
