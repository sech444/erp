import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static const String baseUrl = 'http://YOUR_API_HOST:3001/api/v1';
  static const _storage = FlutterSecureStorage();

  static Future<String?> _getToken() async {
    return await _storage.read(key: 'accessToken');
  }

  static Future<Map<String, String>> _headers() async {
    final token = await _getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // ── Auth ────────────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    return jsonDecode(res.body);
  }

  static Future<void> saveTokens(String access, String refresh, Map user) async {
    await _storage.write(key: 'accessToken',  value: access);
    await _storage.write(key: 'refreshToken', value: refresh);
    await _storage.write(key: 'user',         value: jsonEncode(user));
  }

  static Future<void> logout() async {
    await _storage.deleteAll();
  }

  static Future<Map<String, dynamic>?> getUser() async {
    final s = await _storage.read(key: 'user');
    if (s == null) return null;
    return jsonDecode(s);
  }

  // ── Attendance ──────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> checkIn(double lat, double lng) async {
    final res = await http.post(
      Uri.parse('$baseUrl/hr/attendance/checkin'),
      headers: await _headers(),
      body: jsonEncode({'latitude': lat, 'longitude': lng}),
    );
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> checkOut(double lat, double lng) async {
    final res = await http.post(
      Uri.parse('$baseUrl/hr/attendance/checkout'),
      headers: await _headers(),
      body: jsonEncode({'latitude': lat, 'longitude': lng}),
    );
    return jsonDecode(res.body);
  }

  // ── Projects ────────────────────────────────────────────────────────────────

  static Future<List<dynamic>> getProjects() async {
    final res = await http.get(Uri.parse('$baseUrl/projects'), headers: await _headers());
    final data = jsonDecode(res.body);
    return data['data'] ?? [];
  }

  // ── Site Reports ────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> submitSiteReport(
    String projectId, Map<String, dynamic> report) async {
    final res = await http.post(
      Uri.parse('$baseUrl/projects/$projectId/site-reports'),
      headers: await _headers(),
      body: jsonEncode(report),
    );
    return jsonDecode(res.body);
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> getDashboardMe() async {
    final res = await http.get(Uri.parse('$baseUrl/dashboard/me'), headers: await _headers());
    return jsonDecode(res.body);
  }
}
