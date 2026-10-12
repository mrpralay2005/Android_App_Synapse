# 🚀 Google Colab Android Emulator Setup Guide

## 📱 Run Android APKs in Cloud with Real Phone Screen Sizes

This guide shows you how to use the `Android_Emulator_Colab.ipynb` notebook to run your APKs in Google Colab with GPU acceleration.

---

## 🎯 What You Get

- ✅ **Free cloud Android emulator** (no local installation!)
- ✅ **Multiple phone screen sizes** (Pixel 7 Pro, Galaxy S23, etc.)
- ✅ **GPU acceleration** (T4 GPU support)
- ✅ **Web browser access** (control phone from anywhere)
- ✅ **Full ADB access** (install APKs, debug, screenshots)
- ✅ **12 hours runtime** (Colab free tier)

---

## 🚀 Quick Start (5 Steps)

### Step 1: Upload Notebook to Google Colab

1. Go to: https://colab.research.google.com/
2. Click: **File → Upload notebook**
3. Upload: `Android_Emulator_Colab.ipynb`

**OR** directly open from GitHub:
- Push this file to your GitHub repo
- In Colab: **File → Open notebook → GitHub tab**
- Enter your repo URL

---

### Step 2: Enable GPU

⚠️ **IMPORTANT: Must enable GPU for emulator to work!**

1. In Colab, click: **Runtime → Change runtime type**
2. Select: **T4 GPU** (or any GPU)
3. Click: **Save**

![GPU Selection](https://i.imgur.com/example.png)

---

### Step 3: Run All Cells

**Option A: Run all at once**
```
Runtime → Run all
```

**Option B: Run step-by-step**
- Click the ▶️ play button on each cell
- Wait for each step to complete before moving to next

---

### Step 4: Choose Your Phone Model

When you reach **Step 5** in the notebook, you'll see:

```
📱 Available Phone Models:

1. Google Pixel 7 Pro (1440x3120 @ 560 DPI)
2. Samsung Galaxy S23 (1080x2340 @ 425 DPI)
3. Google Pixel 6 (1080x2400 @ 411 DPI)
4. OnePlus 11 (1080x2400 @ 440 DPI)
5. Small Phone Budget (1080x2280 @ 440 DPI)
6. Custom Size (Enter your own)

👉 Select phone model (1-6):
```

**Type** the number (1-6) and press Enter.

---

### Step 5: Get Your VNC Link

After **Step 10** completes, you'll see:

```
🎉 SUCCESS! Your Android Emulator is accessible at:
════════════════════════════════════════════════════════════

🌐 VNC URL: https://abc123.ngrok.io

📱 Click the link above to access your Android phone!
```

**Click this link** to open the emulator in your browser!

---

## 📱 Using the Emulator

### Access the Phone Screen

1. Click the **VNC URL** from Step 10
2. You'll see a web-based Android phone screen
3. Click on the screen to interact (just like a real phone!)

### Install Your APK

When you reach **Step 12** in notebook:

1. Click the **"Choose Files"** button
2. Select your `.apk` file
3. Wait for upload (may take 1-2 minutes)
4. APK will auto-install
5. Open app drawer in VNC to launch your app!

### Control the Phone

**Mouse Controls:**
- Left click = Tap
- Click and drag = Swipe
- Right click = Back button (sometimes)

**Keyboard Controls:**
- Type normally when text field is focused
- Esc = Back button
- Home = Home button

---

## 🛠️ Useful ADB Commands

After emulator starts, run these in new cells:

### Install APK
```python
!adb install -r /content/your-app.apk
```

### Take Screenshot
```python
!adb shell screencap -p /sdcard/screenshot.png
!adb pull /sdcard/screenshot.png .
from google.colab import files
files.download('screenshot.png')
```

### View App Logs
```python
!adb logcat | grep "YourAppTag"
```

### List Installed Apps
```python
!adb shell pm list packages -3
```

### Uninstall App
```python
!adb uninstall com.your.package.name
```

### Record Video (10 seconds)
```python
!adb shell screenrecord --time-limit 10 /sdcard/demo.mp4
!adb pull /sdcard/demo.mp4 .
from google.colab import files
files.download('demo.mp4')
```

---

## 📊 Phone Screen Configurations

| Phone Model | Resolution | DPI | Aspect Ratio |
|-------------|------------|-----|--------------|
| Pixel 7 Pro | 1440x3120 | 560 | 19.5:9 |
| Galaxy S23 | 1080x2340 | 425 | 19.5:9 |
| Pixel 6 | 1080x2400 | 411 | 20:9 |
| OnePlus 11 | 1080x2400 | 440 | 20:9 |
| Budget Phone | 1080x2280 | 440 | 19:9 |
| Custom | Your choice | Your choice | Your choice |

---

## ⚠️ Important Notes

### Session Limits (Free Tier)
- **12 hours maximum** runtime
- Session closes if idle for 90 minutes
- All data deleted when session ends
- **Download important files** before session ends!

### Performance
- **With GPU (T4)**: Smooth, good for testing
- **Without GPU**: Very slow, not recommended
- **Always enable GPU** in Runtime settings!

### Network
- Emulator has full internet access
- Can test APIs, downloads, etc.
- Some apps may detect emulator (rare)

### Storage
- Colab has ~100GB free space
- Enough for multiple APKs
- Clean up old files if running low

---

## 🔧 Troubleshooting

### ❌ "Emulator won't start"

**Solution:**
```python
# Kill and restart
!pkill -9 emulator
!pkill -9 qemu

# Then re-run Step 11
```

### ❌ "Can't see phone in VNC"

**Solutions:**
1. Wait 3-5 minutes (emulator takes time to boot)
2. Refresh browser tab
3. Check if emulator is online:
   ```python
   !adb devices
   ```
4. Should show: `emulator-5554	device`

### ❌ "VNC link shows blank screen"

**Solutions:**
1. Wait for **Step 11** to fully complete
2. Check emulator status:
   ```python
   !adb shell getprop sys.boot_completed
   # Should return: 1
   ```
3. Restart VNC:
   ```python
   !pkill x11vnc
   # Re-run Step 8
   ```

### ❌ "APK installation failed"

**Solutions:**
1. Check APK is valid:
   ```python
   !aapt dump badging your-app.apk | grep package
   ```
2. Try force reinstall:
   ```python
   !adb install -r -t your-app.apk
   ```
3. Check device space:
   ```python
   !adb shell df -h
   ```

### ❌ "Ngrok tunnel expired"

**Solution:**
- Free ngrok tunnels expire after 2 hours
- Get free auth token: https://dashboard.ngrok.com/signup
- Add in **Step 10**:
  ```python
  ngrok.set_auth_token("YOUR_TOKEN_HERE")
  ```
- Pro accounts get longer tunnels

### ❌ "Out of memory"

**Solutions:**
1. Restart runtime: **Runtime → Restart runtime**
2. Use smaller phone resolution (option 5)
3. Close unused processes:
   ```python
   !ps aux | grep emulator
   !kill -9 PID_NUMBER
   ```

---

## 💡 Pro Tips

### 1. **Get Ngrok Auth Token (Free)**
- Sign up: https://dashboard.ngrok.com/signup
- Copy your token
- Paste in Step 10 (better limits, longer tunnels)

### 2. **Save APK in Google Drive**
```python
from google.colab import drive
drive.mount('/content/drive')

# Install from Drive
!adb install /content/drive/MyDrive/your-app.apk
```

### 3. **Keep Session Alive**
- Keep browser tab open
- Interact with notebook every hour
- Or use this in a cell:
```python
import time
while True:
    time.sleep(300)  # Ping every 5 min
    !echo "alive"
```

### 4. **Multiple APK Testing**
```python
# Install multiple APKs
apks = ['app1.apk', 'app2.apk', 'app3.apk']
for apk in apks:
    !adb install -r {apk}
    print(f"✅ {apk} installed")
```

### 5. **Auto-launch Your App**
```python
# After installing, auto-launch
package_name = "com.your.app"
!adb shell monkey -p {package_name} -c android.intent.category.LAUNCHER 1
```

### 6. **Debug Logs in Real-time**
```python
# Stream logs (Ctrl+C to stop)
!adb logcat -s "ReactNativeJS:*" "DEBUG:*"
```

---

## 📦 What's Included in Notebook

### Full Setup Process:
1. ✅ Check GPU availability
2. ✅ Install Android SDK
3. ✅ Install emulator tools
4. ✅ Accept Android licenses
5. ✅ Create virtual device (AVD)
6. ✅ Configure phone screen size
7. ✅ Start virtual display (Xvfb)
8. ✅ Start VNC server
9. ✅ Create public URL (ngrok)
10. ✅ Boot Android emulator
11. ✅ APK upload & install
12. ✅ ADB commands reference
13. ✅ Troubleshooting tools

---

## 🎓 Learning Resources

### Official Docs:
- [Android ADB](https://developer.android.com/studio/command-line/adb)
- [Emulator CLI](https://developer.android.com/studio/run/emulator-commandline)
- [Google Colab Guide](https://colab.research.google.com/notebooks/welcome.ipynb)

### Video Tutorials:
- [Android Emulator Basics](https://www.youtube.com/results?search_query=android+emulator+tutorial)
- [ADB Commands](https://www.youtube.com/results?search_query=adb+commands+tutorial)

---

## 🆚 Comparison: Colab vs Local

| Feature | Google Colab | Local Emulator |
|---------|-------------|----------------|
| **Cost** | Free | Free |
| **Setup Time** | 5-10 min | 30-60 min |
| **Performance** | Good (T4 GPU) | Better (your GPU) |
| **Storage** | 100GB | Unlimited |
| **Internet** | Always online | Your connection |
| **Session Length** | 12 hours | Unlimited |
| **Installation** | None | 5-10GB download |
| **Access** | Anywhere | Local only |
| **GPU** | T4 (free) | Your GPU |

**Use Colab when:**
- Don't want to install locally
- Testing from different locations
- Limited local storage
- Weak local hardware

**Use Local when:**
- Long-term development
- Need unlimited runtime
- Better performance needed
- Regular daily testing

---

## 🔒 Security & Privacy

### What's Safe:
✅ Running your own APKs
✅ Testing non-sensitive apps
✅ Development/staging builds

### Be Careful:
⚠️ Don't enter real passwords
⚠️ Don't test with production data
⚠️ VNC traffic is not encrypted by default
⚠️ Ngrok exposes public URL (anyone with link can access)

### Best Practices:
1. Use test accounts only
2. Don't install sensitive apps
3. Clear data before session ends
4. Use ngrok auth token (adds protection)
5. Don't share VNC URL publicly

---

## 📞 Support

### Issues?
1. Check **Troubleshooting** section above
2. Review error messages in notebook
3. Try restarting: **Runtime → Restart runtime**

### Common Questions:

**Q: Can I use this for production testing?**
A: Yes, but better for development/staging. Use real devices for production.

**Q: Is this legal?**
A: Yes! You're running official Android tools in your own Colab session.

**Q: Can I test Play Store apps?**
A: Yes, if you have the APK. Play Store itself won't work without Google Play Services.

**Q: How many APKs can I test?**
A: Limited by storage (~100GB), so dozens of APKs easily.

**Q: Can I test paid apps?**
A: Only if you own them and have the APK file.

---

## 🎉 You're Ready!

Now you can:
1. Upload `Android_Emulator_Colab.ipynb` to Google Colab
2. Enable T4 GPU
3. Run all cells
4. Choose phone model
5. Access emulator in browser
6. Install & test your APKs!

**Happy Testing! 🚀📱**

---

## 📝 Changelog

- **v1.0** - Initial release with Pixel 7 Pro, Galaxy S23 support
- GPU acceleration via T4
- noVNC web interface
- Ngrok public URL
- Full ADB support

---

## 🤝 Contributing

Found improvements? Share them!
- Better phone configurations
- Performance optimizations
- Troubleshooting tips

---

**Made with ❤️ for React Native / Android Developers**
