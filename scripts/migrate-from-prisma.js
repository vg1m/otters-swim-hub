// Migration script to transfer data from Prisma SQLite to Supabase
// Run this with: node supabase/migrate-from-prisma.js

const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');

// Configuration - Update these with your Supabase credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const db = new Database('./prisma/dev.db', { readonly: true });

async function migrateSwimmers() {
  console.log('Starting swimmer migration...');
  
  try {
    // Get all swimmers from SQLite
    const swimmers = db.prepare('SELECT * FROM Swimmer').all();
    console.log(`Found ${swimmers.length} swimmers in SQLite database`);

    if (swimmers.length === 0) {
      console.log('No swimmers to migrate');
      return;
    }

    // Group swimmers by parent phone to create unique parents
    const parentMap = new Map();
    
    swimmers.forEach(swimmer => {
      if (!parentMap.has(swimmer.parentPhone)) {
        parentMap.set(swimmer.parentPhone, {
          phone_number: swimmer.parentPhone,
          full_name: `Parent of ${swimmer.firstName}`, // Placeholder name
          role: 'parent',
          swimmers: []
        });
      }
      parentMap.get(swimmer.parentPhone).swimmers.push(swimmer);
    });

    console.log(`Identified ${parentMap.size} unique parents`);

    // Create parent profiles in Supabase
    // Note: This requires parents to sign up first, so we'll create swimmers without parent_id
    // and link them later when parents sign up
    
    const transformedSwimmers = swimmers.map(swimmer => ({
      first_name: swimmer.firstName,
      last_name: swimmer.lastName,
      date_of_birth: swimmer.dob,
      gender: swimmer.gender.toLowerCase(),
      squad: mapCategory(swimmer.category),
      sub_squad: swimmer.squad?.toLowerCase(),
      status: swimmer.status.toLowerCase(),
      license_number: swimmer.licenseNo,
      medical_expiry_date: swimmer.medicalExpiry,
      parent_id: null // Will be linked when parent signs up
    }));

    // Insert swimmers into Supabase (with admin privileges)
    const { data, error } = await supabase
      .from('swimmers')
      .insert(transformedSwimmers)
      .select();

    if (error) {
      console.error('Error inserting swimmers:', error);
      return;
    }

    console.log(`Successfully migrated ${data.length} swimmers`);
    
    // Store phone numbers for reference
    const phoneMapping = swimmers.map((swimmer, index) => ({
      swimmer_id: data[index].id,
      parent_phone: swimmer.parentPhone,
      swimmer_name: `${swimmer.firstName} ${swimmer.lastName}`
    }));

    console.log('\nParent Phone Numbers (save these for linking):');
    console.log(JSON.stringify(phoneMapping, null, 2));

  } catch (error) {
    console.error('Migration error:', error);
  }
}

async function migrateMeets() {
  console.log('\nStarting meet migration...');
  
  try {
    const meets = db.prepare('SELECT * FROM Meet').all();
    console.log(`Found ${meets.length} meets in SQLite database`);

    if (meets.length === 0) {
      console.log('No meets to migrate');
      return;
    }

    const transformedMeets = meets.map(meet => ({
      name: meet.name,
      venue: meet.venue,
      date: meet.date,
      course: meet.course,
      entry_open_date: meet.entryOpen,
      entry_close_date: meet.entryClose,
      transport_available: meet.transportFlag,
      accommodation_available: meet.accommodationFlag,
      transport_cost: meet.transportCost,
      accommodation_cost: meet.accommodationCost,
      qualifying_times: meet.extractedQts ? JSON.parse(meet.extractedQts) : null
    }));

    const { data, error } = await supabase
      .from('meets')
      .insert(transformedMeets)
      .select();

    if (error) {
      console.error('Error inserting meets:', error);
      return;
    }

    console.log(`Successfully migrated ${data.length} meets`);

  } catch (error) {
    console.error('Meet migration error:', error);
  }
}

function mapCategory(category) {
  const categoryMap = {
    'COMPETITIVE': 'competitive',
    'LEARN_TO_SWIM': 'learn_to_swim',
    'FITNESS': 'fitness'
  };
  return categoryMap[category] || 'competitive';
}

async function main() {
  console.log('=================================');
  console.log('Otters Kenya Data Migration');
  console.log('From Prisma SQLite to Supabase');
  console.log('=================================\n');

  await migrateSwimmers();
  await migrateMeets();

  console.log('\n=================================');
  console.log('Migration Complete!');
  console.log('=================================');
  console.log('\nNext steps:');
  console.log('1. Review the migrated data in Supabase dashboard');
  console.log('2. Have parents sign up with their phone numbers');
  console.log('3. Link swimmers to parent accounts using the phone mapping above');
  console.log('4. Delete prisma directory after confirming successful migration');

  db.close();
}

main().catch(console.error);
