import { Helmet } from 'react-helmet-async';

export default function SEO({ 
  title = 'Urban Pilgrim | Wellness Events & Retreats', 
  description = 'Find and book upcoming wellness events, workshops, and classes led by trusted Urban Pilgrim guides—happening near you and across soulful spaces',
  keywords = 'urban pilgrim, wellness, events, retreats, yoga, meditation, breathwork',
  canonicalUrl = '',
  ogImage = '/public/assets/urban_pilgrim_logo.png',
  ogType = 'website',
  children
}) {
  const siteUrl = window.location.origin;
  const fullUrl = canonicalUrl ? `${siteUrl}${canonicalUrl}` : siteUrl;
  const imageUrl = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`;
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Canonical Link */}
      {canonicalUrl && <link rel="canonical" href={fullUrl} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      
      {/* Additional meta tags */}
      {children}
    </Helmet>
  );
}
