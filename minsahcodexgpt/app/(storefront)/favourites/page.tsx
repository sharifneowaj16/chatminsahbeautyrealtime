import { redirect } from 'next/navigation';

export default function FavouritesPage() {
  redirect('/account/wishlist');
}
