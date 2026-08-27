import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SiteSettingsProvider } from './context/SiteSettingsContext'
import { CartProvider } from './context/CartContext'
import { AtelierCartProvider } from './context/AtelierCartContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import ProtectedRoute from './components/ProtectedRoute'
import Accueil from './pages/Accueil'
import NosAteliers from './pages/NosAteliers'
import Connexion from './pages/Connexion'
import Connecteurs from './pages/Connecteurs'
import TableauDeBord from './pages/TableauDeBord'
import Archives from './pages/Archives'
import ActuAdmin from './pages/ActuAdmin'
import AccueilAdmin from './pages/AccueilAdmin'
import Contact from './pages/Contact'
import ContactAdmin from './pages/ContactAdmin'
import NavbarAdmin from './pages/NavbarAdmin'
import Boutique from './pages/Boutique'
import BoutiqueAdmin from './pages/BoutiqueAdmin'
import ProduitsAdmin from './pages/ProduitsAdmin'
import PromosAdmin from './pages/PromosAdmin'
import Galerie from './pages/Galerie'
import GalerieAdmin from './pages/GalerieAdmin'
import CommandesAdmin from './pages/CommandesAdmin'
import ConnexionAdmin from './pages/ConnexionAdmin'

export default function App() {
  return (
    <AuthProvider>
      <SiteSettingsProvider>
        <CartProvider>
          <AtelierCartProvider>
          <BrowserRouter>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <CartDrawer />
              <Routes>
                <Route path="/" element={<Accueil />} />
                <Route path="/ateliers" element={<NosAteliers />} />
                <Route path="/boutique" element={<Boutique />} />
                <Route path="/connexion" element={<Connexion />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/galerie" element={<Galerie />} />
                <Route path="/connecteurs" element={
                  <ProtectedRoute><Connecteurs /></ProtectedRoute>
                } />
                <Route path="/tableau-de-bord" element={
                  <ProtectedRoute><TableauDeBord /></ProtectedRoute>
                } />
                <Route path="/archives" element={
                  <ProtectedRoute><Archives /></ProtectedRoute>
                } />
                <Route path="/actu-moment" element={
                  <ProtectedRoute><ActuAdmin /></ProtectedRoute>
                } />
                <Route path="/accueil-admin" element={
                  <ProtectedRoute><AccueilAdmin /></ProtectedRoute>
                } />
                <Route path="/contact-admin" element={
                  <ProtectedRoute><ContactAdmin /></ProtectedRoute>
                } />
                <Route path="/navbar-admin" element={
                  <ProtectedRoute><NavbarAdmin /></ProtectedRoute>
                } />
                <Route path="/boutique-admin" element={
                  <ProtectedRoute><BoutiqueAdmin /></ProtectedRoute>
                } />
                <Route path="/produits-admin" element={
                  <ProtectedRoute><ProduitsAdmin /></ProtectedRoute>
                } />
                <Route path="/promos-admin" element={
                  <ProtectedRoute><PromosAdmin /></ProtectedRoute>
                } />
                <Route path="/galerie-admin" element={
                  <ProtectedRoute><GalerieAdmin /></ProtectedRoute>
                } />
                <Route path="/commandes-admin" element={
                  <ProtectedRoute><CommandesAdmin /></ProtectedRoute>
                } />
                <Route path="/connexion-admin" element={
                  <ProtectedRoute><ConnexionAdmin /></ProtectedRoute>
                } />
              </Routes>
              <Footer />
            </div>
          </BrowserRouter>
          </AtelierCartProvider>
        </CartProvider>
      </SiteSettingsProvider>
    </AuthProvider>
  )
}
