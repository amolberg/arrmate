package com.arrmate.app.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.arrmate.app.data.ArrmateRepository
import com.arrmate.app.data.ConnectionState
import com.arrmate.app.data.ServiceConfig
import com.arrmate.app.data.ServiceSnapshot
import com.arrmate.app.data.ServiceType
import com.arrmate.app.data.requiresUsername

private enum class AppTab(val label: String, val marker: String) {
    OVERVIEW("Overview", "A"), CONNECTIONS("Connections", "⚙")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ArrmateApp(repository: ArrmateRepository) {
    val model: AppViewModel = viewModel(factory = AppViewModel.factory(repository))
    val state by model.state.collectAsStateWithLifecycle()
    var tab by remember { mutableStateOf(AppTab.OVERVIEW) }
    var editing by remember { mutableStateOf<ServiceConfig?>(null) }
    var showEditor by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf<ServiceConfig?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Arrmate", fontWeight = FontWeight.Bold)
                        Text("Native media stack companion", style = MaterialTheme.typography.labelSmall)
                    }
                },
                actions = {
                    TextButton(onClick = model::refresh, enabled = !state.loading) {
                        Text(if (state.loading) "Checking…" else "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        bottomBar = {
            NavigationBar {
                AppTab.entries.forEach { destination ->
                    NavigationBarItem(
                        selected = tab == destination,
                        onClick = { tab = destination },
                        icon = { Text(destination.marker, fontWeight = FontWeight.Bold) },
                        label = { Text(destination.label) },
                    )
                }
            }
        },
    ) { padding ->
        when (tab) {
            AppTab.OVERVIEW -> OverviewScreen(
                snapshots = state.snapshots,
                loading = state.loading,
                modifier = Modifier.padding(padding),
                onAdd = {
                    editing = null
                    model.clearEditorError()
                    showEditor = true
                },
                onManage = { tab = AppTab.CONNECTIONS },
            )
            AppTab.CONNECTIONS -> ConnectionsScreen(
                snapshots = state.snapshots,
                modifier = Modifier.padding(padding),
                onAdd = {
                    editing = null
                    model.clearEditorError()
                    showEditor = true
                },
                onEdit = {
                    editing = it
                    model.clearEditorError()
                    showEditor = true
                },
                onDelete = { deleting = it },
            )
        }
    }

    if (showEditor) {
        ConnectionEditor(
            initial = editing,
            saving = state.saving,
            error = state.editorError,
            onDismiss = { if (!state.saving) showEditor = false },
            onSave = { config -> model.save(config) { showEditor = false } },
        )
    }

    deleting?.let { config ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("Remove ${config.name}?") },
            text = { Text("The URL and credentials will be deleted from this device.") },
            confirmButton = {
                TextButton(onClick = {
                    model.delete(config)
                    deleting = null
                }) { Text("Remove", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun OverviewScreen(
    snapshots: List<ServiceSnapshot>,
    loading: Boolean,
    modifier: Modifier,
    onAdd: () -> Unit,
    onManage: () -> Unit,
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Text("Your stack, one tap away", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            Text(
                "Arrmate talks directly to services on your network. Nothing is embedded and no Arrmate server sits in between.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (snapshots.isEmpty()) {
            item { EmptyConnections(onAdd) }
        } else {
            item {
                val online = snapshots.count { it.state == ConnectionState.ONLINE }
                SummaryCard(online = online, total = snapshots.size, loading = loading)
            }
            items(snapshots, key = { it.config.id }) { snapshot ->
                ServiceStatusCard(snapshot)
            }
            item {
                OutlinedButton(onClick = onManage, modifier = Modifier.fillMaxWidth()) {
                    Text("Manage connections")
                }
            }
        }
    }
}

@Composable
private fun ConnectionsScreen(
    snapshots: List<ServiceSnapshot>,
    modifier: Modifier,
    onAdd: () -> Unit,
    onEdit: (ServiceConfig) -> Unit,
    onDelete: (ServiceConfig) -> Unit,
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Direct connections", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("Credentials are encrypted by Android Keystore.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                FilledTonalButton(onClick = onAdd) { Text("Add") }
            }
        }
        if (snapshots.isEmpty()) {
            item { EmptyConnections(onAdd) }
        } else {
            items(snapshots, key = { it.config.id }) { snapshot ->
                Card(
                    modifier = Modifier.fillMaxWidth().clickable { onEdit(snapshot.config) },
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                ) {
                    Column(Modifier.padding(16.dp)) {
                        ServiceStatusHeader(snapshot)
                        Spacer(Modifier.height(10.dp))
                        Text(snapshot.config.baseUrl, style = MaterialTheme.typography.bodySmall)
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            TextButton(onClick = { onEdit(snapshot.config) }) { Text("Edit") }
                            TextButton(onClick = { onDelete(snapshot.config) }) {
                                Text("Remove", color = MaterialTheme.colorScheme.error)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyConnections(onAdd: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            OrbitMark()
            Spacer(Modifier.height(16.dp))
            Text("Connect your first service", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            Text(
                "Add Jellyfin, Jellyseerr, Sonarr, Radarr, Bazarr, or qBittorrent.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(18.dp))
            Button(onClick = onAdd) { Text("Add connection") }
        }
    }
}

@Composable
private fun SummaryCard(online: Int, total: Int, loading: Boolean) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
        Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            OrbitMark()
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(if (loading) "Checking services" else "$online of $total online", fontWeight = FontWeight.Bold)
                Text("Live status from your devices", style = MaterialTheme.typography.bodySmall)
            }
            if (loading) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
        }
    }
}

@Composable
private fun ServiceStatusCard(snapshot: ServiceSnapshot) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) { ServiceStatusHeader(snapshot) }
    }
}

@Composable
private fun ServiceStatusHeader(snapshot: ServiceSnapshot) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        StatusDot(snapshot.state)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(snapshot.config.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(snapshot.config.type.displayName, style = MaterialTheme.typography.labelMedium)
        }
        Text(snapshot.detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun StatusDot(state: ConnectionState) {
    val color = when (state) {
        ConnectionState.ONLINE -> Color(0xFF34D399)
        ConnectionState.OFFLINE -> MaterialTheme.colorScheme.error
        ConnectionState.CHECKING -> MaterialTheme.colorScheme.secondary
    }
    Canvas(Modifier.size(12.dp)) { drawCircle(color) }
}

@Composable
private fun OrbitMark() {
    val primary = MaterialTheme.colorScheme.primary
    val secondary = MaterialTheme.colorScheme.secondary
    Canvas(Modifier.size(42.dp)) {
        drawCircle(primary, style = Stroke(width = 5f))
        drawCircle(secondary, radius = 5f, center = center.copy(x = center.x + 12f, y = center.y - 12f))
    }
}

@Composable
private fun ConnectionEditor(
    initial: ServiceConfig?,
    saving: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onSave: (ServiceConfig) -> Unit,
) {
    var type by remember(initial?.id) { mutableStateOf(initial?.type ?: ServiceType.JELLYFIN) }
    var name by remember(initial?.id) { mutableStateOf(initial?.name ?: type.displayName) }
    var url by remember(initial?.id) { mutableStateOf(initial?.baseUrl ?: "") }
    var username by remember(initial?.id) { mutableStateOf(initial?.username ?: "") }
    var secret by remember(initial?.id) { mutableStateOf(initial?.secret ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initial == null) "Add direct connection" else "Edit ${initial.name}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    ServiceType.entries.forEach { candidate ->
                        FilterChip(
                            selected = type == candidate,
                            onClick = {
                                type = candidate
                                if (initial == null || name in ServiceType.entries.map { it.displayName }) name = candidate.displayName
                            },
                            label = { Text(candidate.displayName) },
                        )
                    }
                }
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    label = { Text("Service URL") },
                    placeholder = { Text("http://192.168.1.10:8989") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                if (type.requiresUsername()) {
                    OutlinedTextField(
                        value = username,
                        onValueChange = { username = it },
                        label = { Text("Username") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                OutlinedTextField(
                    value = secret,
                    onValueChange = { secret = it },
                    label = { Text(type.credentialHint) },
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text(
                    "The app connects from this Android device directly to ${type.displayName}.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                error?.let {
                    HorizontalDivider()
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(
                enabled = !saving,
                onClick = {
                    onSave(
                        ServiceConfig(
                            id = initial?.id ?: java.util.UUID.randomUUID().toString(),
                            type = type,
                            name = name,
                            baseUrl = url,
                            username = username,
                            secret = secret,
                        ),
                    )
                },
            ) {
                if (saving) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                    Text("Testing…")
                } else Text("Test & save")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancel") } },
    )
}
