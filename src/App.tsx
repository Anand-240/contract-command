import { RouterProvider } from 'react-router-dom';
import { SessionProvider } from '@/hooks';
import { router } from '@/routes';

export default function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </SessionProvider>
  );
}
