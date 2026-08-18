package com.arrmate.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.arrmate.app.data.ArrmateRepository
import com.arrmate.app.data.ConnectionState
import com.arrmate.app.data.ServiceConfig
import com.arrmate.app.data.ServiceSnapshot
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AppUiState(
    val snapshots: List<ServiceSnapshot> = emptyList(),
    val loading: Boolean = false,
    val saving: Boolean = false,
    val editorError: String? = null,
)

class AppViewModel(private val repository: ArrmateRepository) : ViewModel() {
    private val _state = MutableStateFlow(
        AppUiState(
            snapshots = repository.connections().map {
                ServiceSnapshot(it, ConnectionState.CHECKING, "Waiting to connect")
            },
        ),
    )
    val state: StateFlow<AppUiState> = _state.asStateFlow()

    init { refresh() }

    fun refresh() {
        if (_state.value.loading) return
        viewModelScope.launch {
            _state.update { it.copy(loading = true) }
            val refreshed = repository.refresh()
            _state.update { it.copy(snapshots = refreshed, loading = false) }
        }
    }

    fun save(config: ServiceConfig, onSaved: () -> Unit) {
        if (_state.value.saving) return
        viewModelScope.launch {
            _state.update { it.copy(saving = true, editorError = null) }
            val result = runCatching { repository.verify(config) }
            val snapshot = result.getOrElse { error ->
                _state.update { it.copy(saving = false, editorError = error.message ?: "Invalid connection") }
                return@launch
            }
            if (snapshot.state == ConnectionState.OFFLINE) {
                _state.update { it.copy(saving = false, editorError = snapshot.detail) }
                return@launch
            }
            repository.save(snapshot.config)
            _state.update {
                it.copy(
                    snapshots = repository.connections().map { saved ->
                        if (saved.id == snapshot.config.id) snapshot
                        else it.snapshots.firstOrNull { old -> old.config.id == saved.id }
                            ?: ServiceSnapshot(saved, ConnectionState.CHECKING, "Waiting to connect")
                    },
                    saving = false,
                    editorError = null,
                )
            }
            onSaved()
        }
    }

    fun delete(config: ServiceConfig) {
        repository.delete(config.id)
        _state.update { state -> state.copy(snapshots = state.snapshots.filterNot { it.config.id == config.id }) }
    }

    fun clearEditorError() = _state.update { it.copy(editorError = null) }

    companion object {
        fun factory(repository: ArrmateRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T = AppViewModel(repository) as T
            }
    }
}
