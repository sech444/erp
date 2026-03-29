import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl    = TextEditingController(text: 'admin@erp.local');
  final _passwordCtrl = TextEditingController(text: 'Admin@1234');
  bool _loading = false;
  String? _error;

  Future<void> _login() async {
    setState(() { _loading = true; _error = null; });
    final auth = context.read<AuthService>();
    final err  = await auth.login(_emailCtrl.text, _passwordCtrl.text);
    if (mounted) setState(() { _loading = false; _error = err; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1E3A5F),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(width: 64, height: 64, decoration: BoxDecoration(color: const Color(0xFF2563EB), borderRadius: BorderRadius.circular(16)),
                child: const Icon(Icons.business, color: Colors.white, size: 32)),
              const SizedBox(height: 16),
              const Text('TechServ ERP', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
              const Text('Construction & Waterproofing', style: TextStyle(color: Colors.white54, fontSize: 14)),
              const SizedBox(height: 40),
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      if (_error != null) ...[
                        Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(8)),
                          child: Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13))),
                        const SizedBox(height: 16),
                      ],
                      TextField(controller: _emailCtrl, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined), border: OutlineInputBorder())),
                      const SizedBox(height: 16),
                      TextField(controller: _passwordCtrl, obscureText: true, decoration: const InputDecoration(labelText: 'Password', prefixIcon: Icon(Icons.lock_outline), border: OutlineInputBorder())),
                      const SizedBox(height: 24),
                      SizedBox(width: double.infinity, height: 48,
                        child: ElevatedButton(
                          onPressed: _loading ? null : _login,
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                          child: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Sign In', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
