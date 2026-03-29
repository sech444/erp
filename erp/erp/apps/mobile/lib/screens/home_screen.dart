import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().user;
    return Scaffold(
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('TechServ ERP', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          Text(user?['name'] ?? '', style: const TextStyle(fontSize: 12, color: Colors.white70)),
        ]),
        actions: [
          IconButton(icon: const Icon(Icons.logout), onPressed: () => context.read<AuthService>().logout()),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.fingerprint_outlined), selectedIcon: Icon(Icons.fingerprint), label: 'Attendance'),
          NavigationDestination(icon: Icon(Icons.assignment_outlined), selectedIcon: Icon(Icons.assignment), label: 'Site Report'),
        ],
      ),
      body: [
        const _DashboardTab(),
        const _AttendanceTab(),
        const _SiteReportTab(),
      ][_tab],
    );
  }
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────

class _DashboardTab extends StatefulWidget {
  const _DashboardTab();
  @override
  State<_DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<_DashboardTab> {
  Map<String, dynamic>? _data;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final d = await ApiService.getDashboardMe();
      setState(() { _data = d['data']; _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(padding: const EdgeInsets.all(16), children: [
        Text('Welcome back!', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(DateTime.now().toString().split(' ')[0], style: const TextStyle(color: Colors.grey)),
        const SizedBox(height: 20),
        if (_data?['sales'] != null) ...[
          _KpiCard('Active Leads', '${_data!['sales']['activeLeads']}', Icons.trending_up, Colors.blue),
          const SizedBox(height: 12),
          _KpiCard('Pipeline Value', 'AED ${_data!['sales']['pipelineValue'].toStringAsFixed(0)}', Icons.attach_money, Colors.green),
          const SizedBox(height: 12),
        ],
        if (_data?['inventory'] != null) ...[
          _KpiCard('Low Stock Items', '${_data!['inventory']['lowStockCount']}', Icons.warning_amber, Colors.orange),
          const SizedBox(height: 12),
        ],
        _KpiCard('Unread Alerts', '${_data?['alerts']?['unreadCount'] ?? 0}', Icons.notifications, Colors.red),
      ]),
    );
  }

  Widget _KpiCard(String label, String value, IconData icon, Color color) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: CircleAvatar(backgroundColor: color.withOpacity(0.1), child: Icon(icon, color: color)),
        title: Text(label, style: const TextStyle(fontSize: 13, color: Colors.grey)),
        trailing: Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
      ),
    );
  }
}

// ── Attendance Tab ────────────────────────────────────────────────────────────

class _AttendanceTab extends StatefulWidget {
  const _AttendanceTab();
  @override
  State<_AttendanceTab> createState() => _AttendanceTabState();
}

class _AttendanceTabState extends State<_AttendanceTab> {
  bool _checkedIn = false;
  bool _loading   = false;
  String? _message;
  DateTime? _checkInTime;

  Future<Position?> _getPosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) { setState(() => _message = 'Location services are disabled.'); return null; }
    LocationPermission perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
    if (perm == LocationPermission.deniedForever) { setState(() => _message = 'Location permission permanently denied.'); return null; }
    return await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
  }

  Future<void> _handleCheckIn() async {
    setState(() { _loading = true; _message = null; });
    final pos = await _getPosition();
    if (pos == null) { setState(() => _loading = false); return; }
    try {
      await ApiService.checkIn(pos.latitude, pos.longitude);
      setState(() { _checkedIn = true; _checkInTime = DateTime.now(); _message = 'Checked in successfully!'; _loading = false; });
    } catch (e) { setState(() { _message = 'Check-in failed: $e'; _loading = false; }); }
  }

  Future<void> _handleCheckOut() async {
    setState(() { _loading = true; _message = null; });
    final pos = await _getPosition();
    if (pos == null) { setState(() => _loading = false); return; }
    try {
      await ApiService.checkOut(pos.latitude, pos.longitude);
      setState(() { _checkedIn = false; _message = 'Checked out successfully!'; _loading = false; });
    } catch (e) { setState(() { _message = 'Check-out failed: $e'; _loading = false; }); }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 140, height: 140,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _checkedIn ? Colors.green.shade50 : Colors.blue.shade50,
              border: Border.all(color: _checkedIn ? Colors.green : Colors.blue, width: 3),
            ),
            child: Icon(_checkedIn ? Icons.check_circle : Icons.fingerprint, size: 64, color: _checkedIn ? Colors.green : Colors.blue),
          ),
          const SizedBox(height: 24),
          Text(_checkedIn ? 'Checked In' : 'Not Checked In', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: _checkedIn ? Colors.green : Colors.grey.shade700)),
          if (_checkInTime != null) ...[
            const SizedBox(height: 4),
            Text('Since ${_checkInTime!.hour.toString().padLeft(2,'0')}:${_checkInTime!.minute.toString().padLeft(2,'0')}', style: const TextStyle(color: Colors.grey)),
          ],
          const SizedBox(height: 8),
          const Text('GPS location will be recorded', style: TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 32),
          if (_message != null) ...[
            Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: _message!.contains('successfully') ? Colors.green.shade50 : Colors.red.shade50, borderRadius: BorderRadius.circular(8)),
              child: Text(_message!, style: TextStyle(color: _message!.contains('successfully') ? Colors.green.shade700 : Colors.red.shade700))),
            const SizedBox(height: 16),
          ],
          SizedBox(width: double.infinity, height: 52,
            child: ElevatedButton.icon(
              onPressed: _loading ? null : (_checkedIn ? _handleCheckOut : _handleCheckIn),
              icon: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Icon(_checkedIn ? Icons.logout : Icons.login),
              label: Text(_checkedIn ? 'Check Out' : 'Check In', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: _checkedIn ? Colors.red : Colors.blue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Site Report Tab ───────────────────────────────────────────────────────────

class _SiteReportTab extends StatefulWidget {
  const _SiteReportTab();
  @override
  State<_SiteReportTab> createState() => _SiteReportTabState();
}

class _SiteReportTabState extends State<_SiteReportTab> {
  List<dynamic> _projects = [];
  String? _selectedProjectId;
  final _progressCtrl   = TextEditingController();
  final _manpowerCtrl   = TextEditingController(text: '0');
  final _notesCtrl      = TextEditingController();
  double _progressPct   = 0;
  bool _loading         = false;
  bool _submitted       = false;

  @override
  void initState() { super.initState(); _loadProjects(); }

  Future<void> _loadProjects() async {
    try { final p = await ApiService.getProjects(); setState(() => _projects = p); } catch (_) {}
  }

  Future<void> _submit() async {
    if (_selectedProjectId == null || _progressCtrl.text.isEmpty) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Select a project and describe work progress'))); return; }
    setState(() => _loading = true);
    try {
      await ApiService.submitSiteReport(_selectedProjectId!, {
        'reportDate': DateTime.now().toIso8601String().split('T')[0],
        'workProgress': _progressCtrl.text,
        'progressPct': _progressPct,
        'manpowerCount': int.tryParse(_manpowerCtrl.text) ?? 0,
        'notes': _notesCtrl.text,
      });
      setState(() { _submitted = true; _loading = false; });
    } catch (e) { setState(() => _loading = false); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'))); }
  }

  @override
  Widget build(BuildContext context) {
    if (_submitted) {
      return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.check_circle, size: 80, color: Colors.green),
        const SizedBox(height: 16),
        const Text('Report Submitted!', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        const Text('Site progress report has been saved.', style: TextStyle(color: Colors.grey)),
        const SizedBox(height: 32),
        ElevatedButton(onPressed: () => setState(() { _submitted = false; _progressCtrl.clear(); _notesCtrl.clear(); _selectedProjectId = null; _progressPct = 0; }), child: const Text('Submit Another')),
      ]));
    }

    return ListView(padding: const EdgeInsets.all(16), children: [
      const Text('Daily Site Report', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      const SizedBox(height: 4),
      Text(DateTime.now().toString().split(' ')[0], style: const TextStyle(color: Colors.grey)),
      const SizedBox(height: 20),
      DropdownButtonFormField<String>(
        value: _selectedProjectId,
        hint: const Text('Select Project'),
        decoration: const InputDecoration(labelText: 'Project', border: OutlineInputBorder()),
        items: _projects.map<DropdownMenuItem<String>>((p) => DropdownMenuItem(value: p['id'] as String, child: Text('${p['projectCode']} — ${p['name']}', overflow: TextOverflow.ellipsis))).toList(),
        onChanged: (v) => setState(() => _selectedProjectId = v),
      ),
      const SizedBox(height: 16),
      TextField(controller: _progressCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Work Progress Description *', border: OutlineInputBorder(), alignLabelWithHint: true)),
      const SizedBox(height: 16),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Progress: ${_progressPct.toInt()}%', style: const TextStyle(fontWeight: FontWeight.w600)),
        Slider(value: _progressPct, min: 0, max: 100, divisions: 20, label: '${_progressPct.toInt()}%', onChanged: (v) => setState(() => _progressPct = v)),
      ]),
      const SizedBox(height: 8),
      TextField(controller: _manpowerCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Manpower Count', border: OutlineInputBorder())),
      const SizedBox(height: 16),
      TextField(controller: _notesCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Additional Notes / Issues', border: OutlineInputBorder(), alignLabelWithHint: true)),
      const SizedBox(height: 24),
      SizedBox(height: 52, child: ElevatedButton.icon(
        onPressed: _loading ? null : _submit,
        icon: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.send),
        label: const Text('Submit Report', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
      )),
    ]);
  }
}
