import { seedBasicInfo } from "./basic-info.seed";
import { seedSkills } from "./skills.seed";
import { seedBlogs } from "./blogs.seed";
import { seedCertifications } from "./certifications.seed";
import { seedExperience } from "./experience.seed";

export async function runFullIngestion() {
  try {
    await seedBasicInfo();
    await seedSkills();
    await seedBlogs();
    await seedCertifications();
    await seedExperience();
    console.log('All collections seeded successfully');
  } catch (error) {
    console.error('Error seeding knowledge base:', error);
    throw error;
  }
}

// Run the seed script if called directly
runFullIngestion().catch(() => {
  process.exitCode = 1;
});