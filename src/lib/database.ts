import { supabase } from './supabase';

export interface PriceData {
  id: string;
  año: number;
  mes: number;
  fecha_publicacion: string;
  codigo_ciudad: string;
  nombre_ciudad: string;
  division: string;
  grupo: string;
  clase: string;
  subclase: string;
  codigo_generico: string;
  nombre_generico: string;
  consecutivo: number;
  especificacion: string | null;
  precio_promedio: number;
  cantidad: number;
  unidad: string;
  estatus: string;
  created_at: string;
}

export async function searchPriceData({
  city,
  product,
  startDate,
  endDate
}: {
  city?: string;
  product?: string;
  startDate?: string;
  endDate?: string;
}): Promise<PriceData[]> {
  let query = supabase
    .from('price_data')
    .select('*');

  if (city) {
    query = query.or(`codigo_ciudad.ilike.%${city}%,nombre_ciudad.ilike.%${city}%`);
  }

  if (product) {
    query = query.or(`codigo_generico.ilike.%${product}%,nombre_generico.ilike.%${product}%`);
  }

  if (startDate) {
    query = query.gte('fecha_publicacion', startDate);
  }

  if (endDate) {
    query = query.lte('fecha_publicacion', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getPriceHistory(
  codigoGenerico: string,
  nombreCiudad: string
): Promise<PriceData[]> {
  const { data, error } = await supabase
    .from('price_data')
    .select('*')
    .eq('codigo_generico', codigoGenerico)
    .eq('nombre_ciudad', nombreCiudad)
    .order('fecha_publicacion', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAveragePriceByCity(
  codigoGenerico: string,
  startDate: string,
  endDate: string
): Promise<Array<{ nombre_ciudad: string; precio_promedio: number }>> {
  const { data, error } = await supabase
    .from('price_data')
    .select('nombre_ciudad, precio_promedio')
    .eq('codigo_generico', codigoGenerico)
    .gte('fecha_publicacion', startDate)
    .lte('fecha_publicacion', endDate)
    .order('nombre_ciudad');

  if (error) throw error;
  
  // Calculate average price per city
  const cityPrices = data?.reduce((acc, curr) => {
    if (!acc[curr.nombre_ciudad]) {
      acc[curr.nombre_ciudad] = { sum: 0, count: 0 };
    }
    acc[curr.nombre_ciudad].sum += curr.precio_promedio;
    acc[curr.nombre_ciudad].count += 1;
    return acc;
  }, {} as Record<string, { sum: number; count: number }>) || {};

  return Object.entries(cityPrices).map(([city, { sum, count }]) => ({
    nombre_ciudad: city,
    precio_promedio: sum / count
  }));
}