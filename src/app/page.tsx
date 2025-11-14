import { redirect } from 'next/navigation';

export default function HomePage() {
  // Ana sayfaya giren herkesi login sayfasına yönlendir
  redirect('/login');
}