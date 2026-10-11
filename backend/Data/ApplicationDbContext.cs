using Microsoft.EntityFrameworkCore;
using Home4Paws.API.Models.Entities;

namespace Home4Paws.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        private readonly IWebHostEnvironment _environment;

        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, IWebHostEnvironment environment) 
            : base(options)
        {
            _environment = environment;
        }

        // DbSets for your entities
        public DbSet<User> Users { get; set; } = null!;
        public DbSet<UserSession> UserSessions { get; set; } = null!;
        public DbSet<Product> Products { get; set; } = null!;
        public DbSet<Category> Categories { get; set; } = null!;
        public DbSet<Order> Orders { get; set; } = null!;
        public DbSet<OrderItem> OrderItems { get; set; } = null!;
        public DbSet<UserAddress> UserAddresses { get; set; } = null!;
        public DbSet<Feedback> Feedbacks { get; set; } = null!;
        public DbSet<PetReport> PetReports { get; set; } = null!;
        public DbSet<AdoptionListing> AdoptionListings { get; set; } = null!;
        public DbSet<AdoptionApplication> AdoptionApplications { get; set; } = null!;
        public DbSet<AdoptionFavorite> AdoptionFavorites { get; set; } = null!;
        public DbSet<AdoptionMessage> AdoptionMessages { get; set; } = null!;
        public DbSet<PetListing> PetListings { get; set; } = null!;
        public DbSet<PetInquiry> PetInquiries { get; set; } = null!;
        public DbSet<PetFavorite> PetFavorites { get; set; } = null!;
        public DbSet<PetPhoto> PetPhotos { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Configure schema based on environment
            var schema = _environment.IsDevelopment() ? "development" : "production";
            modelBuilder.HasDefaultSchema(schema);

            // Configure User entity
            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("users");
                
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.FirstName).HasColumnName("first_name").HasMaxLength(50).IsRequired();
                entity.Property(e => e.LastName).HasColumnName("last_name").HasMaxLength(50).IsRequired();
                entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
                entity.Property(e => e.PasswordHash).HasColumnName("password_hash").HasMaxLength(500).IsRequired();
                entity.Property(e => e.Role).HasColumnName("role").HasMaxLength(20).HasDefaultValue("User");
                entity.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true);
                entity.Property(e => e.EmailVerified).HasColumnName("email_verified").HasDefaultValue(false);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.LastLoginAt).HasColumnName("last_login_at");
                entity.Property(e => e.FailedLoginAttempts).HasColumnName("failed_login_attempts").HasDefaultValue(0);
                entity.Property(e => e.LockoutEnd).HasColumnName("lockout_end");
                entity.Property(e => e.AuthProvider).HasColumnName("auth_provider").HasMaxLength(20).HasDefaultValue("Local");

                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasIndex(e => e.IsActive);
            });

            // Configure UserSession entity
            modelBuilder.Entity<UserSession>(entity =>
            {
                entity.ToTable("user_sessions");
                
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.Token).HasColumnName("token").IsRequired();
                entity.Property(e => e.RefreshToken).HasColumnName("refresh_token").HasMaxLength(500).IsRequired();
                entity.Property(e => e.ExpiresAt).HasColumnName("expires_at").IsRequired();
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true);
                entity.Property(e => e.DeviceInfo).HasColumnName("device_info");
                entity.Property(e => e.IpAddress).HasColumnName("ip_address").HasMaxLength(45);

                entity.HasIndex(e => e.RefreshToken).IsUnique();
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.ExpiresAt);

                // Foreign key relationship
                entity.HasOne(e => e.User)
                    .WithMany(u => u.Sessions)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure Product entity
            modelBuilder.Entity<Product>(entity =>
            {
                entity.ToTable("products");
                
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Description).HasColumnName("description");
                entity.Property(e => e.Sku).HasColumnName("sku").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Price).HasColumnName("price").HasColumnType("decimal(18,2)").IsRequired();
                entity.Property(e => e.StockQuantity).HasColumnName("stock_quantity").IsRequired();
                entity.Property(e => e.ImageUrl).HasColumnName("image_url").HasMaxLength(255).IsRequired();
                entity.Property(e => e.CategoryId).HasColumnName("category_id");
                entity.Property(e => e.IsFeatured).HasColumnName("is_featured").HasDefaultValue(false);
                entity.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true);
                // Changed from CreatedAt to DateCreated
                entity.Property(e => e.DateCreated).HasColumnName("created_at").HasDefaultValueSql("NOW()");
                // Changed from UpdatedAt to DateUpdated
                entity.Property(e => e.DateUpdated).HasColumnName("updated_at").HasDefaultValueSql("NOW()");

                entity.HasIndex(e => e.Name);
                entity.HasIndex(e => e.CategoryId);

                // Foreign key relationship
                entity.HasOne(e => e.Category)
                    .WithMany(c => c.Products)
                    .HasForeignKey(e => e.CategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure Category entity
            modelBuilder.Entity<Category>(entity =>
            {
                entity.ToTable("categories");
                
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Description).HasColumnName("description");

                entity.HasIndex(e => e.Name);
            });

            // Configure Category-Product relationship
            modelBuilder.Entity<Category>()
                .HasMany(c => c.Products)
                .WithOne(p => p.Category)
                .HasForeignKey(p => p.CategoryId);

            // Configure Order entity
            modelBuilder.Entity<Order>(entity =>
            {
                entity.ToTable("orders");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.OrderDate).HasColumnName("order_date").HasDefaultValueSql("NOW()");
                entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
                entity.Property(e => e.TotalAmount).HasColumnName("total_amount").HasColumnType("decimal(18,2)").IsRequired();
                entity.Property(e => e.ShippingAddress).HasColumnName("shipping_address").HasMaxLength(255).IsRequired();
                entity.Property(e => e.BillingAddress).HasColumnName("billing_address").HasMaxLength(255).IsRequired();
                entity.Property(e => e.PaymentMethod).HasColumnName("payment_method").HasMaxLength(50).IsRequired();
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.OrderDate);

                // Foreign key relationship
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure OrderItem entity
            modelBuilder.Entity<OrderItem>(entity =>
            {
                entity.ToTable("order_items");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.OrderId).HasColumnName("order_id").IsRequired();
                entity.Property(e => e.ProductId).HasColumnName("product_id").IsRequired();
                entity.Property(e => e.Quantity).HasColumnName("quantity").IsRequired();
                entity.Property(e => e.UnitPrice).HasColumnName("unit_price").HasColumnType("decimal(18,2)").IsRequired();
                entity.Property(e => e.TotalPrice).HasColumnName("total_price").HasColumnType("decimal(18,2)").IsRequired();
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");

                entity.HasIndex(e => e.OrderId);
                entity.HasIndex(e => e.ProductId);

                // Foreign key relationship
                entity.HasOne(e => e.Order)
                    .WithMany(o => o.OrderItems)
                    .HasForeignKey(e => e.OrderId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Product)
                    .WithMany()
                    .HasForeignKey(e => e.ProductId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure UserAddress entity
            modelBuilder.Entity<UserAddress>(entity =>
            {
                entity.ToTable("user_addresses");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.AddressType).HasColumnName("address_type").HasMaxLength(50).IsRequired();
                entity.Property(e => e.FirstName).HasColumnName("first_name").HasMaxLength(50).IsRequired();
                entity.Property(e => e.LastName).HasColumnName("last_name").HasMaxLength(50).IsRequired();
                entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(20).IsRequired();
                entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
                entity.Property(e => e.Address).HasColumnName("address").HasMaxLength(255).IsRequired();
                entity.Property(e => e.Apartment).HasColumnName("apartment").HasMaxLength(100);
                entity.Property(e => e.City).HasColumnName("city").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Province).HasColumnName("province").HasMaxLength(100).IsRequired();
                entity.Property(e => e.District).HasColumnName("district").HasMaxLength(100).IsRequired();
                entity.Property(e => e.PostalCode).HasColumnName("postal_code").HasMaxLength(20).IsRequired();
                entity.Property(e => e.Country).HasColumnName("country").HasMaxLength(100).HasDefaultValue("Sri Lanka");
                entity.Property(e => e.IsDefault).HasColumnName("is_default").HasDefaultValue(false);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => new { e.UserId, e.IsDefault });
            });

            // Configure User-UserAddress relationship
            modelBuilder.Entity<User>()
                .HasMany<UserAddress>()
                .WithOne(a => a.User)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure Feedback entity
            modelBuilder.Entity<Feedback>(entity =>
            {
                entity.ToTable("feedbacks");
                
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.Rating).HasColumnName("rating").IsRequired();
                entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
                entity.Property(e => e.Comment).HasColumnName("comment").IsRequired();
                entity.Property(e => e.IsApproved).HasColumnName("is_approved").HasDefaultValue(false);
                entity.Property(e => e.IsFeatured).HasColumnName("is_featured").HasDefaultValue(false);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");

                entity.HasOne(f => f.User)
                    .WithMany()
                    .HasForeignKey(f => f.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                // Add indexes for better performance
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.IsApproved);
                entity.HasIndex(e => e.IsFeatured);
            });

            // Configure PetReport entity
            modelBuilder.Entity<PetReport>(entity =>
            {
                entity.ToTable("pet_reports");
                
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
                entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
                entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Breed).HasColumnName("breed").HasMaxLength(100);
                entity.Property(e => e.Color).HasColumnName("color").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Age).HasColumnName("age").HasMaxLength(20).IsRequired();
                entity.Property(e => e.Gender).HasColumnName("gender").HasMaxLength(20).IsRequired();
                entity.Property(e => e.Size).HasColumnName("size").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(1000);
                entity.Property(e => e.ReportType).HasColumnName("report_type").HasMaxLength(20).IsRequired();
                entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
                entity.Property(e => e.DateReported).HasColumnName("date_reported").HasDefaultValueSql("NOW()");
                entity.Property(e => e.LostOrFoundDate).HasColumnName("lost_or_found_date").IsRequired();
                entity.Property(e => e.Location).HasColumnName("location").HasMaxLength(200).IsRequired();
                entity.Property(e => e.Latitude).HasColumnName("latitude").HasColumnType("double precision");
                entity.Property(e => e.Longitude).HasColumnName("longitude").HasColumnType("double precision");
                entity.Property(e => e.ContactName).HasColumnName("contact_name").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(10).IsRequired();
                entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
                entity.Property(e => e.PhotoUrls)
                    .HasColumnName("photo_urls")
                    .HasColumnType("jsonb")
                    .HasConversion(
                        v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions)null!),
                        v => System.Text.Json.JsonSerializer.Deserialize<string[]>(v, (System.Text.Json.JsonSerializerOptions)null!) ?? Array.Empty<string>()
                    );
                entity.Property(e => e.IdentifyingFeatures).HasColumnName("identifying_features").HasMaxLength(1000);
                entity.Property(e => e.MedicalConditions).HasColumnName("medical_conditions").HasMaxLength(500);
                entity.Property(e => e.IsChipped).HasColumnName("is_chipped");
                entity.Property(e => e.ChipNumber).HasColumnName("chip_number").HasMaxLength(50);
                entity.Property(e => e.HasReward).HasColumnName("has_reward");
                entity.Property(e => e.RewardAmount).HasColumnName("reward_amount").HasMaxLength(20);
                entity.Property(e => e.Views).HasColumnName("views");
                entity.Property(e => e.IsUrgent).HasColumnName("is_urgent");
                entity.Property(e => e.IsClosed).HasColumnName("is_closed");
                entity.Property(e => e.ClosedAt).HasColumnName("closed_at");
                entity.Property(e => e.ClosureReason).HasColumnName("closure_reason").HasMaxLength(100);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.AdminNotes).HasColumnName("admin_notes").HasMaxLength(500);

                // Indexes for common queries
                entity.HasIndex(e => e.Type);
                entity.HasIndex(e => e.ReportType);
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.Location);
                entity.HasIndex(e => e.LostOrFoundDate);
                
                // Create spatial index
                entity.HasIndex(e => new { e.Latitude, e.Longitude })
                    .HasDatabaseName("IX_PetReports_Location_Spatial");
            });

            // Configure AdoptionListing entity
            modelBuilder.Entity<AdoptionListing>(entity =>
            {
                entity.ToTable("adoption_listings");

                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();

                // Pet Info
                entity.Property(e => e.PetName).HasColumnName("pet_name").HasMaxLength(100).IsRequired();
                entity.Property(e => e.PetType).HasColumnName("pet_type").HasMaxLength(50).IsRequired();
                entity.Property(e => e.Breed).HasColumnName("breed").HasMaxLength(100);
                entity.Property(e => e.AgeYears).HasColumnName("age_years");
                entity.Property(e => e.AgeMonths).HasColumnName("age_months");
                entity.Property(e => e.Gender).HasColumnName("gender").HasMaxLength(20).IsRequired();
                entity.Property(e => e.Size).HasColumnName("size").HasMaxLength(50).IsRequired();
                entity.Property(e => e.Color).HasColumnName("color").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Description).HasColumnName("description");

                // Health & Behavior
                entity.Property(e => e.HealthStatus).HasColumnName("health_status").HasMaxLength(100);
                entity.Property(e => e.VaccinationStatus).HasColumnName("vaccination_status").HasMaxLength(200);
                entity.Property(e => e.IsSpayedNeutered).HasColumnName("is_spayed_neutered");
                entity.Property(e => e.IsHouseTrained).HasColumnName("is_house_trained");
                entity.Property(e => e.GoodWithKids).HasColumnName("good_with_kids");
                entity.Property(e => e.GoodWithPets).HasColumnName("good_with_pets");
                entity.Property(e => e.EnergyLevel).HasColumnName("energy_level").HasMaxLength(50);
                entity.Property(e => e.SpecialNeeds).HasColumnName("special_needs");

                // Adoption terms
                entity.Property(e => e.AdoptionType).HasColumnName("adoption_type").HasMaxLength(20).IsRequired();
                entity.Property(e => e.AdoptionFee).HasColumnName("adoption_fee").HasColumnType("decimal(10,2)").HasDefaultValue(0);
                entity.Property(e => e.RehomingReason).HasColumnName("rehoming_reason");

                // Contact
                entity.Property(e => e.ContactName).HasColumnName("contact_name").HasMaxLength(100).IsRequired();
                entity.Property(e => e.ContactPhone).HasColumnName("contact_phone").HasMaxLength(20).IsRequired();
                entity.Property(e => e.ContactEmail).HasColumnName("contact_email").HasMaxLength(255).IsRequired();
                entity.Property(e => e.Location).HasColumnName("location").HasMaxLength(200).IsRequired();
                entity.Property(e => e.City).HasColumnName("city").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Province).HasColumnName("province").HasMaxLength(100).IsRequired();
                entity.Property(e => e.District).HasColumnName("district").HasMaxLength(100);
                entity.Property(e => e.Latitude).HasColumnName("latitude").HasColumnType("double precision");
                entity.Property(e => e.Longitude).HasColumnName("longitude").HasColumnType("double precision");

                // Media
                entity.Property(e => e.PhotoUrls)
                    .HasColumnName("photo_urls")
                    .HasColumnType("jsonb")
                    .HasConversion(
                        v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions)null!),
                        v => System.Text.Json.JsonSerializer.Deserialize<string[]>(v, (System.Text.Json.JsonSerializerOptions)null!) ?? Array.Empty<string>()
                    );
                entity.Property(e => e.VideoUrl).HasColumnName("video_url");

                // Moderation & Status
                entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).HasDefaultValue("Pending");
                entity.Property(e => e.AdminNotes).HasColumnName("admin_notes");
                entity.Property(e => e.RejectionReason).HasColumnName("rejection_reason");
                entity.Property(e => e.ApprovedByAdminId).HasColumnName("approved_by_admin_id");
                entity.Property(e => e.ApprovedAt).HasColumnName("approved_at");

                // Metrics
                entity.Property(e => e.Views).HasColumnName("views").HasDefaultValue(0);
                entity.Property(e => e.FavoritesCount).HasColumnName("favorites_count").HasDefaultValue(0);
                entity.Property(e => e.IsFeatured).HasColumnName("is_featured").HasDefaultValue(false);
                entity.Property(e => e.IsUrgent).HasColumnName("is_urgent").HasDefaultValue(false);

                // Timestamps
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.AdoptedAt).HasColumnName("adopted_at");

                // Relationships
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Indexes
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.PetType);
                entity.HasIndex(e => e.City);
                entity.HasIndex(e => e.AdoptionType);
                entity.HasIndex(e => e.CreatedAt);
            });

            // Configure AdoptionApplication entity
            modelBuilder.Entity<AdoptionApplication>(entity =>
            {
                entity.ToTable("adoption_applications");

                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.ListingId).HasColumnName("listing_id").IsRequired();
                entity.Property(e => e.ApplicantId).HasColumnName("applicant_id").IsRequired();

                entity.Property(e => e.ApplicantName).HasColumnName("applicant_name").HasMaxLength(100).IsRequired();
                entity.Property(e => e.ApplicantPhone).HasColumnName("applicant_phone").HasMaxLength(20).IsRequired();
                entity.Property(e => e.ApplicantEmail).HasColumnName("applicant_email").HasMaxLength(255).IsRequired();
                entity.Property(e => e.ApplicantAddress).HasColumnName("applicant_address").IsRequired();

                entity.Property(e => e.HousingType).HasColumnName("housing_type").HasMaxLength(50);
                entity.Property(e => e.HasYard).HasColumnName("has_yard");
                entity.Property(e => e.OtherPets).HasColumnName("other_pets");
                entity.Property(e => e.HouseholdMembers).HasColumnName("household_members");
                entity.Property(e => e.HasChildren).HasColumnName("has_children");

                entity.Property(e => e.PetExperience).HasColumnName("pet_experience");
                entity.Property(e => e.WhyAdopt).HasColumnName("why_adopt").IsRequired();

                entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).HasDefaultValue("Pending");
                entity.Property(e => e.OwnerNotes).HasColumnName("owner_notes");

                entity.Property(e => e.AppliedAt).HasColumnName("applied_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.ReviewedAt).HasColumnName("reviewed_at");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");

                entity.HasIndex(e => new { e.ListingId, e.ApplicantId }).IsUnique();
                entity.HasIndex(e => e.ListingId);
                entity.HasIndex(e => e.ApplicantId);

                entity.HasOne(e => e.Listing)
                    .WithMany()
                    .HasForeignKey(e => e.ListingId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Applicant)
                    .WithMany()
                    .HasForeignKey(e => e.ApplicantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure AdoptionFavorite entity
            modelBuilder.Entity<AdoptionFavorite>(entity =>
            {
                entity.ToTable("adoption_favorites");

                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.ListingId).HasColumnName("listing_id").IsRequired();
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");

                entity.HasIndex(e => new { e.UserId, e.ListingId }).IsUnique();

                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Listing)
                    .WithMany()
                    .HasForeignKey(e => e.ListingId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure AdoptionMessage entity
            modelBuilder.Entity<AdoptionMessage>(entity =>
            {
                entity.ToTable("adoption_messages");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.ListingId).HasColumnName("listing_id").IsRequired();
                entity.Property(e => e.SenderId).HasColumnName("sender_id").IsRequired();
                entity.Property(e => e.ReceiverId).HasColumnName("receiver_id").IsRequired();
                entity.Property(e => e.Message).HasColumnName("message").IsRequired();
                entity.Property(e => e.IsRead).HasColumnName("is_read").HasDefaultValue(false);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");

                entity.HasOne(e => e.Listing)
                    .WithMany()
                    .HasForeignKey(e => e.ListingId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Sender)
                    .WithMany()
                    .HasForeignKey(e => e.SenderId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Receiver)
                    .WithMany()
                    .HasForeignKey(e => e.ReceiverId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.ListingId);
                entity.HasIndex(e => e.SenderId);
                entity.HasIndex(e => e.ReceiverId);
            });
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            // Convert all DateTime properties to UTC before saving
            var entries = ChangeTracker.Entries()
                .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

            foreach (var entry in entries)
            {
                foreach (var property in entry.Properties)
                {
                    if (property.Metadata.ClrType == typeof(DateTime))
                    {
                        var value = (DateTime?)property.CurrentValue;
                        if (value.HasValue && value.Value.Kind != DateTimeKind.Utc)
                        {
                            property.CurrentValue = DateTime.SpecifyKind(value.Value, DateTimeKind.Utc);
                        }
                    }
                    else if (property.Metadata.ClrType == typeof(DateTime?))
                    {
                        var value = (DateTime?)property.CurrentValue;
                        if (value.HasValue && value.Value.Kind != DateTimeKind.Utc)
                        {
                            property.CurrentValue = DateTime.SpecifyKind(value.Value, DateTimeKind.Utc);
                        }
                    }
                }
            }

            return base.SaveChangesAsync(cancellationToken);
        }
    }
}