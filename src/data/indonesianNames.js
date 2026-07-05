export const indonesianNames = [
  'Siti Rahayu', 'Dewi Kusuma', 'Anisa Putri', 'Nur Hidayah', 'Ratna Sari',
  'Evi Lestari', 'Wahyu Purnama', 'Indah Permata', 'Lilis Suryani', 'Fitriani',
  'Aulia Rahma', 'Desy Wulandari', 'Rini Agustina', 'Maya Puspita', 'Sri Wahyuni',
  'Heni Kartika', 'Ayu Pramesti', 'Novia Andriani', 'Sari Dewi', 'Putri Handayani',
  'Mega Lestari', 'Yuli Astuti', 'Rina Sari', 'Dian Permatasari', 'Fitri Handayani',
  'Wulandari', 'Nurul Aini', 'Layla Sari', 'Mira Kusuma', 'Tia Rahmawati',
  'Rizky Amelia', 'Salma Nur', 'Farah Diaz', 'Nadia Safitri', 'Amanda Putri',
  'Cindy Permata', 'Elsa Rahmawati', 'Fiona Kusuma', 'Gita Maharani', 'Hana Pratiwi',
  'Irma Suryani', 'Jeni Lestari', 'Kartika Dewi', 'Luna Maya', 'Mita Sari',
  'Nabila Azzahra', 'Olivia Permata', 'Putri Cantika', 'Qonita Salma', 'Rara Kusuma'
];

export const getRandomName = () => {
  return indonesianNames[Math.floor(Math.random() * indonesianNames.length)];
};
