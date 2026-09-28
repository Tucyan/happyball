# Happy Ball 3D (螺旋跳跃)

基于 Three.js + TypeScript + Vite + Capacitor 打造的高性能 3D 螺旋跳跃（Helix Jump）街机手游。

---

## 🌟 核心特色

- **高保真 3D 螺旋物理与渲染**：
  - 基于 Three.js 深度定制的圆柱塔身与多边形扇区平台。
  - 小球重力加速度、弹跳形变压扁弹性动画与着陆墨迹粒子特效。
  - **穿层碎裂崩解（Shatter Effect）**：穿过缺口瞬间平台即刻崩散为 3D 碎片并向下飞溅翻滚，打击感拉满。
- **自由摄像机俯仰轨道控制**：
  - 镜头以小球为中心进行球面俯仰轨道旋转（Pitch Orbit），始终面向小球。
  - 设置面板内置摄像机视角滑块（5°~65°，默认 26°），即时动态调整视角。
- **阶梯连击连跳计分机制**：
  - 连续下落穿层获得递增奖励分（+1, +2, +3, +4，封顶 +5/层）。
  - 超载冲刺状态（连续穿过 3 层以上激活流火冲刺状态），直接击碎下一层安全地块。
- **个性装扮商城系统**：
  - 闯关得分 1:1 转化为金币。
  - 多款小球皮肤（经典宝蓝、炽热熔岩、赛博霓虹、翡翠晶绿、耀眼鎏金、暗夜幽影）。
  - 流光粒子拖尾（凝润水滴、烈焰尾迹、极光幻彩、璀璨星芒）。
  - 地面墨迹喷漆与碎片颜色随小球皮肤实时联动。
- **丰富游戏设置**：
  - 旋转灵敏度无极调节（默认 2.9x）
  - 反向手势滑动开关
  - 视野距离（标准 / 远 / 超远）
  - 摄像机视角仰角设置
  - 调试模式：层间距动态微调
- **原生 Android 深度适配**：
  - Capacitor 6 原生打包，60 FPS 流畅无卡顿。
  - 适配 Android Adaptive Icons（圆形/圆角矩形自适应图标，各 DPI 全面覆盖）。
  - 支持正式签名 Release APK 与 Debug APK 自动化构建。

---

## 🛠️ 技术栈

- **渲染引擎**：[Three.js](https://threejs.org/) (WebGL)
- **开发语言**：TypeScript
- **构建工具**：Vite
- **移动打包**：Capacitor 6 (Android)
- **构建环境**：Gradle, Android SDK (API 34/35)

---

## 🚀 快速开始

### 1. 环境准备
确保本机安装了 Node.js (>= 18) 与 Android SDK。

### 2. 安装依赖
```bash
npm install
```

### 3. 本地网页调试
```bash
npm run dev
```
打开浏览器访问控制台输出的本地服务地址（如 `http://localhost:5173`）。

### 4. 编译与同步 Android 工程
```bash
# 编译前端静态资源
npm run build

# 同步到 Android 原生工程
npx cap sync android
```

### 5. Android 打包构建
进入 `android` 目录运行 Gradle 构建：
```bash
cd android

# 构建 Debug 测试版
./gradlew assembleDebug

# 构建 Release 正式签名版
./gradlew assembleRelease
```

生成 APK 产物路径：
- **Release APK**：`android/app/build/outputs/apk/release/app-release.apk`
- **Debug APK**：`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📄 开源许可

本项目基于 [MIT License](LICENSE) 开源。
