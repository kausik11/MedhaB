const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const slugify = require("../utils/slugify");

async function migrateSlugs() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is not defined. Check .env path.");
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");

    const blogsWithoutSlug = await Blog.find({
      $or: [{ slug: { $exists: false } }, { slug: "" }],
    });

    console.log(`Found ${blogsWithoutSlug.length} blogs without slug`);

    for (let blog of blogsWithoutSlug) {
      let baseSlug = slugify(blog.title);
      let slug = baseSlug;
      let counter = 1;

      // Handle duplicate slugs
      while (await Blog.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      blog.slug = slug;
      await blog.save();

      console.log(`Updated: ${blog.title} -> ${slug}`);
    }

    console.log("Slug migration completed");
    process.exit();
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateSlugs();
