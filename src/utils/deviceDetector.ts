import { useState, useEffect } from 'react';

export type MachineCategory = 'mobile' | 'tablet' | 'laptop' | 'desktop';
export type OperatingSystem = 'Android' | 'iOS' | 'Windows' | 'macOS' | 'Linux' | 'ChromeOS' | 'Otro';

export interface DeviceInfo {
  machineCategory: MachineCategory;
  machineLabel: string; // "Móvil", "Tablet", "Portátil", "Escritorio"
  os: OperatingSystem;
  osVersionHint: string;
  browser: string;
  environmentLabel: string; // "App Web Móvil" | "App Web Tablet" | "App Web Portátil / Escritorio"
  isMobileOrTablet: boolean;
  isTouch: boolean;
  viewportWidth: number;
  viewportHeight: number;
  orientation: 'Vertical' | 'Horizontal';
  summaryBadge: string; // e.g., "Móvil · Android · Chrome" or "Portátil · Windows · Chrome"
}

interface NavigatorUAData {
  mobile?: boolean;
  platform?: string;
}

export function detectDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      machineCategory: 'desktop',
      machineLabel: 'Escritorio',
      os: 'Otro',
      osVersionHint: '',
      browser: 'Navegador Web',
      environmentLabel: 'App Web de Escritorio',
      isMobileOrTablet: false,
      isTouch: false,
      viewportWidth: 1440,
      viewportHeight: 900,
      orientation: 'Horizontal',
      summaryBadge: 'Escritorio · Web',
    };
  }

  const ua = navigator.userAgent || '';
  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isTouch =
    maxTouchPoints > 0 ||
    'ontouchstart' in window ||
    window.matchMedia?.('(pointer: coarse)').matches;

  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1024;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 768;
  const screenWidth = window.screen?.width || viewportWidth;
  const screenHeight = window.screen?.height || viewportHeight;
  const minScreenDim = Math.min(screenWidth, screenHeight);
  const maxScreenDim = Math.max(screenWidth, screenHeight);

  // 1. Detect Operating System (Android, iOS, Windows, macOS, Linux, ChromeOS)
  let os: OperatingSystem = 'Otro';
  let osVersionHint = '';

  const isIPadOS =
    /iPad/i.test(ua) || (MacintoshTest(ua) && maxTouchPoints > 1);
  const isIPhoneOrIPod = /iPhone|iPod/i.test(ua);

  if (isIPadOS || isIPhoneOrIPod) {
    os = 'iOS';
    const match = ua.match(/OS (\d+[_\d]*)/i);
    if (match) {
      osVersionHint = `iOS ${match[1].replace(/_/g, '.')}`;
    } else {
      osVersionHint = isIPadOS ? 'iPadOS' : 'iOS';
    }
  } else if (/Android/i.test(ua)) {
    os = 'Android';
    const match = ua.match(/Android\s+([\d.]+)/i);
    osVersionHint = match ? `Android ${match[1]}` : 'Android';
  } else if (/CrOS/i.test(ua)) {
    os = 'ChromeOS';
    osVersionHint = 'ChromeOS';
  } else if (/Win/i.test(ua) || /Windows/i.test(uaData?.platform || '')) {
    os = 'Windows';
    osVersionHint = 'Windows';
  } else if (MacintoshTest(ua) || /Mac/i.test(uaData?.platform || '')) {
    os = 'macOS';
    osVersionHint = 'macOS';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    osVersionHint = 'Linux';
  }

  // 2. Detect Browser
  let browser = 'Navegador Web';
  if (/SamsungBrowser/i.test(ua)) {
    browser = 'Samsung Internet';
  } else if (/Edg\//i.test(ua)) {
    browser = 'Edge';
  } else if (/OPR\/|Opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/CriOS|Chrome/i.test(ua) && !/Edg\//i.test(ua)) {
    browser = 'Chrome';
  } else if (/FxiOS|Firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) {
    browser = 'Safari';
  }

  // 3. Detect Machine Category: mobile | tablet | laptop | desktop
  let machineCategory: MachineCategory = 'desktop';
  let machineLabel = 'Escritorio';

  const isAndroidTablet = os === 'Android' && !/Mobile/i.test(ua);
  const isGenericTablet =
    isIPadOS ||
    isAndroidTablet ||
    /Tablet|PlayBook|Silk|Kindle/i.test(ua) ||
    (isTouch && minScreenDim >= 600 && maxScreenDim <= 1366 && (os === 'Android' || os === 'iOS'));

  const isSmartphone =
    !isGenericTablet &&
    (isIPhoneOrIPod ||
      (os === 'Android' && /Mobile/i.test(ua)) ||
      uaData?.mobile === true ||
      (isTouch && viewportWidth < 768));

  if (isSmartphone) {
    machineCategory = 'mobile';
    machineLabel = 'Móvil';
  } else if (isGenericTablet) {
    machineCategory = 'tablet';
    machineLabel = 'Tablet';
  } else {
    // Distinguish Laptop (Portátil) vs Desktop (Escritorio) using screen dimensions, DPI & touch/trackpad heuristics
    const dpr = window.devicePixelRatio || 1;
    const isLikelyLaptop =
      (maxScreenDim <= 1920 && dpr >= 1.25 && maxScreenDim * dpr <= 3456) ||
      maxScreenDim <= 1680 ||
      isTouch;

    if (isLikelyLaptop) {
      machineCategory = 'laptop';
      machineLabel = 'Portátil';
    } else {
      machineCategory = 'desktop';
      machineLabel = 'Escritorio';
    }
  }

  const isMobileOrTablet = machineCategory === 'mobile' || machineCategory === 'tablet';
  const environmentLabel =
    machineCategory === 'mobile'
      ? `Web Móvil (${os})`
      : machineCategory === 'tablet'
      ? `Web Tablet (${os})`
      : `Web ${machineLabel} (${os})`;

  const orientation = viewportWidth >= viewportHeight ? 'Horizontal' : 'Vertical';
  const summaryBadge = `${machineLabel} · ${os} · ${browser}`;

  return {
    machineCategory,
    machineLabel,
    os,
    osVersionHint,
    browser,
    environmentLabel,
    isMobileOrTablet,
    isTouch,
    viewportWidth,
    viewportHeight,
    orientation,
    summaryBadge,
  };
}

function MacintoshTest(ua: string): boolean {
  return /Macintosh|Mac OS X/i.test(ua);
}

export function useDeviceDetection(): DeviceInfo {
  const [device, setDevice] = useState<DeviceInfo>(() => detectDeviceInfo());

  useEffect(() => {
    const updateDevice = () => {
      setDevice(detectDeviceInfo());
    };

    window.addEventListener('resize', updateDevice);
    window.addEventListener('orientationchange', updateDevice);
    return () => {
      window.removeEventListener('resize', updateDevice);
      window.removeEventListener('orientationchange', updateDevice);
    };
  }, []);

  return device;
}
