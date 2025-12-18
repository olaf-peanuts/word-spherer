import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create a dummy admin user (Azure AD object ID placeholder)
  await prisma.user.create({
    data: {
      id: '00000000-0000-0000-0000-000000000001',
      displayName: 'Admin User',
      email: 'admin@example.com'
    }
  });

  // Create a root category
  await prisma.category.create({
    data: {
      name: 'General',
      slug: 'general'
    }
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
