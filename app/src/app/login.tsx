import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={require('../../assets/images/jodtod/plan-trips-login.png')}
          style={styles.hero}
          resizeMode="cover"
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#0B3D62" />
          </TouchableOpacity>

          

          <Text style={styles.welcomeTitle}>Welcome back!</Text>
          <Text style={styles.welcomeSubtitle}>
            Login to continue managing{'\n'}your trips and expenses
          </Text>
        </ImageBackground>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Login to your account</Text>

          <Text style={styles.label}>Email address</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color="#20A374" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#A0A0A0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#20A374" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#A0A0A0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color="#888"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/(tabs)' as any)}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

           

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-google" size={18} color="#DB4437" />
              <Text style={styles.socialText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-apple" size={20} color="#000" />
              <Text style={styles.socialText}>Apple</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  hero: {
    height: 320,
    paddingHorizontal: 24,
    paddingTop: 50,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  brandIcon: {
    width: 40,
    height: 40,
    marginRight: 8,
  },

  brandText: {
    width: 110,
    height: 32,
  },

  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0B3D62',
    marginBottom: 6,
  },

  welcomeSubtitle: {
    fontSize: 14,
    color: '#3A5468',
    lineHeight: 20,
  },

  card: {
    backgroundColor: '#fff',
    marginTop: -30,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0B3D62',
    marginBottom: 24,
  },

  label: {
    fontSize: 13,
    color: '#3A5468',
    marginBottom: 8,
    fontWeight: '600',
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8EC',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 18,
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: '#0B3D62',
  },

  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#20A374',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  checkboxChecked: {
    backgroundColor: '#20A374',
  },

  rememberText: {
    fontSize: 13,
    color: '#3A5468',
  },

  forgotText: {
    fontSize: 13,
    color: '#20A374',
    fontWeight: '600',
  },

  loginButton: {
    backgroundColor: '#1E8F6F',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8EC',
  },

  dividerText: {
    fontSize: 12,
    color: '#888',
    marginHorizontal: 12,
  },

  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },

  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8EC',
    borderRadius: 12,
    height: 48,
    gap: 8,
  },

  socialText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0B3D62',
  },

  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },

  signupText: {
    fontSize: 13,
    color: '#3A5468',
  },

  signupLink: {
    fontSize: 13,
    color: '#20A374',
    fontWeight: '700',
  },

  securityBox: {
    flexDirection: 'row',
    backgroundColor: '#EAF6F1',
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
    gap: 12,
  },

  securityIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  securityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B3D62',
    marginBottom: 3,
  },

  securitySubtitle: {
    fontSize: 12,
    color: '#5A7385',
    lineHeight: 17,
  },
});