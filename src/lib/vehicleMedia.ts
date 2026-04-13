const imageSources: Record<string, string[]> = {
  ex5: [
    'https://images.unsplash.com/photo-1619767886432-60864512d327?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1400&q=80',
  ],
  monjaro: [
    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1400&q=80',
  ],
  'lynk-co-09': [
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1485463611174-f302f6a5c1c9?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1400&q=80',
  ],
  coolray: [
    'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1498887960847-2a5e46312788?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1400&q=80',
  ],
  'lynk-co-06': [
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=1400&q=80',
  ],
  'lynk-co-01': [
    'https://images.unsplash.com/photo-1552519507-cf0d5a6e5d0d?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1541348263662-e068662d82af?auto=format&fit=crop&w=1400&q=80',
  ],
  'lynk-co-08': [
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1400&q=80',
  ],
  ec40: [
    'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1593941707882-a5bac6861d75?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1617814076668-8df2f5f9b57e?auto=format&fit=crop&w=1400&q=80',
  ],
  'lynk-co-03': [
    'https://images.unsplash.com/photo-1555215695-3004980adade?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1400&q=80',
  ],
};

export function getVehicleImage(modelSlug: string): string {
  return (imageSources[modelSlug] ?? imageSources.ex5)[0];
}

export function getVehicleImageSources(modelSlug: string): string[] {
  return imageSources[modelSlug] ?? imageSources.ex5;
}

export function getVehicleGallery(modelSlug: string): string[] {
  const [primary] = getVehicleImageSources(modelSlug);
  return [
    primary,
    'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1514316454349-750a7fd3da3a?auto=format&fit=crop&w=1400&q=80',
  ];
}
