import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/auth_service.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
      ],
      child: const TechServERPApp(),
    ),
  );
}

class TechServERPApp extends StatelessWidget {
  const TechServERPApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TechServ ERP',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF2563EB),
          foregroundColor: Colors.white,
          elevation: 0,
        ),
      ),
      home: Consumer<AuthService>(
        builder: (ctx, auth, _) => auth.isLoggedIn ? const HomeScreen() : const LoginScreen(),
      ),
    );
  }
}
