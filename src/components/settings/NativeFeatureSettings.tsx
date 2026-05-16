import { useEffect, useState, type ReactNode } from 'react';
import { Bell, Camera, Fingerprint, Hand, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { NativeReminders } from '../../plugins/nativeReminders';
import { CameraCapture, scheduleCameraCaptureReminder, type CameraCaptureResponse } from '../../plugins/cameraCapture';
import { BiometricLock, type BiometricStatus } from '../../plugins/biometricLock';
import { HapticsBridge } from '../../plugins/haptics';

export function NativeFeatureSettings() {
  const [status, setStatus] = useState<BiometricStatus | null>(null);
  const [message, setMessage] = useState('');
  const [capture, setCapture] = useState<CameraCaptureResponse | null>(null);
  const [intervalMinutes, setIntervalMinutes] = useState(5);

  useEffect(() => {
    BiometricLock.getStatus()
      .then(setStatus)
      .catch((error) =>
        setStatus({
          platform: 'unknown',
          available: false,
          enrolled: false,
          message: error instanceof Error ? error.message : 'Biometric status unavailable.',
        }),
      );
  }, []);

  async function testReminder() {
    await NativeReminders.requestPermissions();
    const result = await NativeReminders.schedule({
      id: Date.now(),
      title: 'Offline AI reminder test',
      body: 'Local notifications are working.',
      delayMs: 5000,
    });
    setMessage(`Reminder scheduled for ${new Date(result.scheduledAt).toLocaleTimeString()}.`);
  }

  async function testBiometric() {
    try {
      const result = await BiometricLock.authenticate({ reason: 'Confirm private memory access' });
      setMessage(result.authenticated ? 'Biometric unlock confirmed.' : 'Biometric unlock was not completed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Biometric unlock failed.');
    }
  }

  async function testCamera() {
    try {
      const result = await CameraCapture.capturePhoto();
      setCapture(result);
      setMessage(`Captured ${result.name ?? 'photo'} locally.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Camera capture failed.');
    }
  }

  async function scheduleCameraReminder() {
    const result = await scheduleCameraCaptureReminder(intervalMinutes);
    setMessage(`Camera reminder scheduled for ${new Date(result.scheduledAt).toLocaleTimeString()}.`);
  }

  async function testHaptics() {
    await HapticsBridge.impact({ style: 'medium' });
    setMessage('Haptic feedback sent.');
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <NativeAction icon={Bell} title="Notification test" description="Schedules a local reminder in 5 seconds.">
          <Button type="button" size="sm" rounded="2xl" className="min-h-10 w-full" onClick={testReminder}>
            Test
          </Button>
        </NativeAction>

        <NativeAction icon={Fingerprint} title="Biometric lock" description={status?.message ?? 'Checking device unlock status.'}>
          <Button
            type="button"
            size="sm"
            rounded="2xl"
            className="min-h-10 w-full"
            onClick={testBiometric}
            disabled={!status?.available}
          >
            Unlock
          </Button>
        </NativeAction>

        <NativeAction icon={Camera} title="Camera capture" description="Opens the camera and saves a local image path.">
          <Button type="button" size="sm" rounded="2xl" className="min-h-10 w-full" onClick={testCamera}>
            Capture
          </Button>
        </NativeAction>

        <NativeAction icon={Hand} title="Haptics" description="Sends a short phone vibration for confirmations.">
          <Button type="button" size="sm" rounded="2xl" className="min-h-10 w-full" onClick={testHaptics}>
            Tap
          </Button>
        </NativeAction>
      </div>

      <div className="rounded-2xl bg-white/60 p-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800">Interval camera reminders</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Privacy-safe interval capture schedules a reminder; the user still opens the camera intentionally.
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            aria-label="Camera reminder interval minutes"
            type="number"
            min={1}
            max={240}
            value={intervalMinutes}
            onChange={(event) => setIntervalMinutes(Number(event.target.value))}
            className="h-11 w-24 rounded-xl border border-teal-900/10 bg-white/80 px-3 text-sm font-bold text-slate-700 outline-none focus:border-primary"
          />
          <span className="text-sm font-medium text-slate-500">minutes</span>
          <Button type="button" size="sm" rounded="2xl" className="ml-auto min-h-10" onClick={scheduleCameraReminder}>
            Schedule
          </Button>
        </div>
      </div>

      {capture ? (
        <p className="rounded-2xl bg-white/60 p-3 text-xs leading-5 text-slate-600">
          Last capture: {capture.name ?? 'photo'} at {new Date(capture.capturedAt).toLocaleString()}
        </p>
      ) : null}

      {message ? <p className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">{message}</p> : null}
    </div>
  );
}

function NativeAction({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/60 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800">{title}</p>
          <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
