import 'package:flutter/material.dart';
import 'api_service.dart';

class AuthService extends ChangeNotifier {
  Map<String, dynamic>? _user;
  bool _isLoggedIn = false;

  bool get isLoggedIn => _isLoggedIn;
  Map<String, dynamic>? get user => _user;

  Future<void> init() async {
    _user = await ApiService.getUser();
    _isLoggedIn = _user != null;
    notifyListeners();
  }

  Future<String?> login(String email, String password) async {
    try {
      final result = await ApiService.login(email, password);
      if (result['success'] == true) {
        final data = result['data'];
        await ApiService.saveTokens(data['accessToken'], data['refreshToken'], data['user']);
        _user = data['user'];
        _isLoggedIn = true;
        notifyListeners();
        return null;
      }
      return result['error']?['message'] ?? 'Login failed';
    } catch (e) {
      return 'Could not connect to server';
    }
  }

  Future<void> logout() async {
    await ApiService.logout();
    _user = null;
    _isLoggedIn = false;
    notifyListeners();
  }
}
