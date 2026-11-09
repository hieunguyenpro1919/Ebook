import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        detail: resolve(__dirname, 'pages/product-detail.html'),
        login: resolve(__dirname, 'pages/login.html'),
        dangky: resolve(__dirname, 'pages/dangky.html'),
        cart: resolve(__dirname, 'pages/cart.html'),
        orders: resolve(__dirname, 'pages/orders.html'),
        admin: resolve(__dirname, 'pages/admin.html'),
        seller: resolve(__dirname, 'pages/seller.html'),
        profile: resolve(__dirname, 'pages/profile.html'),
        wishlist: resolve(__dirname, 'pages/wishlist.html')
      }
    }
  }
});
