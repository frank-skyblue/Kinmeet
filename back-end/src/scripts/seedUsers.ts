import mongoose from 'mongoose';
import { User } from '../models/User';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/kinmeet';

const seedUsers = [
  {
    email: 'lucia.martinez@example.com',
    password: 'Password123',
    firstName: 'Lucia',
    lastName: 'Martinez',
    about: 'Moved to Canada two years ago for work. Love exploring new cities and meeting people from back home.',
    jobTitle: 'UX Designer',
    company: 'Shopify',
    institution: 'Universidad de Buenos Aires',
    graduationYear: 2019,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    languages: ['Spanish', 'English'],
    interests: ['Photography', 'Hiking', 'Cooking', 'Travel'],
    lookingFor: ['Friendship', 'Networking'] as ('Friendship' | 'Networking' | 'Support')[],
    profileComplete: true,
  },
  {
    email: 'mateo.gomez@example.com',
    password: 'Password123',
    firstName: 'Mateo',
    lastName: 'Gomez',
    about: 'Software developer from Córdoba. Always up for asado and fútbol on weekends.',
    jobTitle: 'Software Engineer',
    company: 'RBC',
    institution: 'Universidad Nacional de Córdoba',
    graduationYear: 2017,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    languages: ['Spanish', 'English', 'Portuguese'],
    interests: ['Sports', 'Gaming', 'Cooking', 'Technology'],
    lookingFor: ['Friendship', 'Networking'] as ('Friendship' | 'Networking' | 'Support')[],
    profileComplete: true,
  },
  {
    email: 'valentina.lopez@example.com',
    password: 'Password123',
    firstName: 'Valentina',
    lastName: 'Lopez',
    about: 'Nurse practitioner passionate about healthcare and community. Miss my family in Mendoza but love my life here.',
    jobTitle: 'Nurse Practitioner',
    company: 'SickKids Hospital',
    institution: 'Universidad de Mendoza',
    graduationYear: 2016,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    languages: ['Spanish', 'English'],
    interests: ['Yoga', 'Reading', 'Volunteering', 'Gardening'],
    lookingFor: ['Friendship', 'Support'] as ('Friendship' | 'Networking' | 'Support')[],
    profileComplete: true,
  },
  {
    email: 'santiago.fernandez@example.com',
    password: 'Password123',
    firstName: 'Santiago',
    lastName: 'Fernandez',
    about: 'Entrepreneur building a fintech startup. Relocated from Rosario. Always looking to connect with fellow Argentines.',
    jobTitle: 'Co-Founder & CEO',
    company: 'PayLatam',
    institution: 'Universidad Austral',
    graduationYear: 2015,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    languages: ['Spanish', 'English', 'Italian'],
    interests: ['Technology', 'Running', 'Reading', 'Wine Tasting'],
    lookingFor: ['Networking', 'Friendship'] as ('Friendship' | 'Networking' | 'Support')[],
    profileComplete: true,
  },
  {
    email: 'camila.ruiz@example.com',
    password: 'Password123',
    firstName: 'Camila',
    lastName: 'Ruiz',
    about: 'Graduate student researching climate science. From Buenos Aires, adjusting to Canadian winters!',
    jobTitle: 'Research Assistant',
    company: 'University of Toronto',
    institution: 'University of Toronto',
    graduationYear: 2026,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    languages: ['Spanish', 'English', 'French'],
    interests: ['Science', 'Hiking', 'Photography', 'Cycling'],
    lookingFor: ['Friendship', 'Support'] as ('Friendship' | 'Networking' | 'Support')[],
    profileComplete: true,
  },
  {
    email: 'nicolas.silva@example.com',
    password: 'Password123',
    firstName: 'Nicolas',
    lastName: 'Silva',
    about: 'Data analyst who loves board games and craft beer. Proud porteño living in the GTA.',
    jobTitle: 'Senior Data Analyst',
    company: 'TD Bank',
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    languages: ['Spanish', 'English'],
    interests: ['Board Games', 'Technology', 'Cooking', 'Sports'],
    lookingFor: ['Friendship'] as ('Friendship' | 'Networking' | 'Support')[],
    profileComplete: true,
  },
  {
    email: 'sofia.moreno@example.com',
    password: 'Password123',
    firstName: 'Sofia',
    lastName: 'Moreno',
    about: 'Architect turned project manager. Love exploring art galleries and discovering hidden gems around Toronto.',
    jobTitle: 'Project Manager',
    company: 'AECOM',
    institution: 'Universidad de La Plata',
    graduationYear: 2018,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    languages: ['Spanish', 'English'],
    interests: ['Arts & Culture', 'Photography', 'Travel', 'Theatre'],
    lookingFor: ['Friendship', 'Networking'] as ('Friendship' | 'Networking' | 'Support')[],
    profileComplete: true,
  },
  {
    email: 'joaquin.garcia@example.com',
    password: 'Password123',
    firstName: 'Joaquin',
    lastName: 'Garcia',
    about: 'Personal trainer and fitness enthusiast from Mar del Plata. Helping people get strong, one rep at a time.',
    jobTitle: 'Personal Trainer',
    company: 'GoodLife Fitness',
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    languages: ['Spanish', 'English'],
    interests: ['Fitness', 'Running', 'Cooking', 'Music'],
    lookingFor: ['Friendship', 'Networking', 'Support'] as ('Friendship' | 'Networking' | 'Support')[],
    profileComplete: true,
  },
  {
    email: 'martina.aguirre@example.com',
    password: 'Password123',
    firstName: 'Martina',
    lastName: 'Aguirre',
    about: 'Marketing professional and tango dancer. Bringing a little bit of Buenos Aires everywhere I go.',
    jobTitle: 'Marketing Manager',
    company: 'Scotiabank',
    institution: 'ITBA',
    graduationYear: 2020,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    languages: ['Spanish', 'English', 'French'],
    interests: ['Dancing', 'Music', 'Fashion', 'Travel'],
    lookingFor: ['Friendship', 'Networking'] as ('Friendship' | 'Networking' | 'Support')[],
    profileComplete: true,
  },
  {
    email: 'tomas.perez@example.com',
    password: 'Password123',
    firstName: 'Tomas',
    lastName: 'Perez',
    about: 'Recently arrived in Canada. Working in construction management and looking to meet people from home.',
    jobTitle: 'Construction Manager',
    company: 'EllisDon',
    institution: 'Universidad Tecnológica Nacional',
    graduationYear: 2014,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    languages: ['Spanish', 'English'],
    interests: ['Sports', 'Camping', 'DIY Projects', 'Fishing'],
    lookingFor: ['Friendship', 'Support'] as ('Friendship' | 'Networking' | 'Support')[],
    profileComplete: true,
  },
];

const seed = async () => {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: 'kinmeet' });
    console.log('Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const userData of seedUsers) {
      const exists = await User.findOne({ email: userData.email });
      if (exists) {
        console.log(`Skipped (already exists): ${userData.email}`);
        skipped++;
        continue;
      }

      await User.create(userData);
      console.log(`Created: ${userData.firstName} ${userData.lastName} (${userData.email})`);
      created++;
    }

    console.log(`\nDone! Created ${created} users, skipped ${skipped}.`);
    console.log('All users share password: Password123');
  } catch (error) {
    console.error('Seed failed:', error);
  } finally {
    await mongoose.disconnect();
  }
};

seed();
