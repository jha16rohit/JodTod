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

export default function Signup() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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

          <Text style={styles.welcomeTitle}>Create account</Text>
          <Text style={styles.welcomeSubtitle}>
            Sign up to start planning trips{'\n'}and splitting expenses with friends
          </Text>
        </ImageBackground>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create your account</Text>

          <Text style={styles.label}>Full name</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color="#20A374" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#A0A0A0"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

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
              placeholder="Create a password"
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

          <Text style={styles.label}>Confirm password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#20A374" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#A0A0A0"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color="#888"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text style={styles.termsText}>
              I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signupButton} onPress={() => router.push('/(tabs)' as any)}>
            <Text style={styles.signupButtonText}>Sign Up</Text>
          </TouchableOpacity>

          <View style={styles.brandRow}>
            <Image
              source={require('../../assets/images/jodtod/jodtod-text.png')}
              style={styles.brandText}
              resizeMode="contain"
            />
          </View>

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

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.securityBox}>
            <View style={styles.securityIconWrap}>
              <Ionicons name="shield-checkmark" size={20} color="#20A374" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>Your data is safe with us</Text>
              <Text style={styles.securitySubtitle}>
                We never share your personal information with anyone.
              </Text>
            </View>
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
    height: 260,
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

  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#20A374',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },

  checkboxChecked: {
    backgroundColor: '#20A374',
  },

  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#3A5468',
    lineHeight: 19,
  },

  termsLink: {
    color: '#20A374',
    fontWeight: '600',
  },

  signupButton: {
    backgroundColor: '#1E8F6F',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  brandText: {
    width: 110,
    height: 32,
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

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },

  loginText: {
    fontSize: 13,
    color: '#3A5468',
  },

  loginLink: {
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