using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Home4Paws.API.Migrations
{
    /// <inheritdoc />
    public partial class AddLockoutAuthProviderAndSyncPetListings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // auth_provider / failed_login_attempts / lockout_end / user_sessions.updated_at
            // are the actual V10 + OAuth work. The pet_listings/favorites/inquiries/photos
            // tables below are unrelated, pre-existing drift: those entities were added to
            // the DbContext by the AI dog-breed-recognition feature but no one ever ran a
            // migration for them, so this was the first migrations add to catch it. Left in
            // one migration rather than split because dotnet ef migrations remove misbehaves
            // in this environment (a .NET 8 tool running under a .NET 10-only runtime).
            migrationBuilder.AddColumn<string>(
                name: "auth_provider",
                schema: "development",
                table: "users",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Local");

            migrationBuilder.AddColumn<int>(
                name: "failed_login_attempts",
                schema: "development",
                table: "users",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "lockout_end",
                schema: "development",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                schema: "development",
                table: "user_sessions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.CreateTable(
                name: "pet_listings",
                schema: "development",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    species = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    breed = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    age_years = table.Column<int>(type: "integer", nullable: true),
                    age_months = table.Column<int>(type: "integer", nullable: true),
                    gender = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    size = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    color = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    weight_kg = table.Column<decimal>(type: "numeric", nullable: true),
                    listing_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    price = table.Column<decimal>(type: "numeric", nullable: true),
                    description = table.Column<string>(type: "text", nullable: false),
                    is_vaccinated = table.Column<bool>(type: "boolean", nullable: false),
                    is_neutered = table.Column<bool>(type: "boolean", nullable: false),
                    is_microchipped = table.Column<bool>(type: "boolean", nullable: false),
                    microchip_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    health_conditions = table.Column<string>(type: "text", nullable: true),
                    temperament = table.Column<string>(type: "text", nullable: true),
                    good_with_kids = table.Column<bool>(type: "boolean", nullable: true),
                    good_with_dogs = table.Column<bool>(type: "boolean", nullable: true),
                    good_with_cats = table.Column<bool>(type: "boolean", nullable: true),
                    training_level = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    location = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    province = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    latitude = table.Column<double>(type: "double precision", nullable: true),
                    longitude = table.Column<double>(type: "double precision", nullable: true),
                    contact_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    contact_phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    contact_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    contact_preference = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    photo_urls = table.Column<List<string>>(type: "text[]", nullable: true),
                    video_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    admin_notes = table.Column<string>(type: "text", nullable: true),
                    rejection_reason = table.Column<string>(type: "text", nullable: true),
                    approved_by = table.Column<int>(type: "integer", nullable: true),
                    approved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_featured = table.Column<bool>(type: "boolean", nullable: false),
                    is_urgent = table.Column<bool>(type: "boolean", nullable: false),
                    special_needs = table.Column<string>(type: "text", nullable: true),
                    adoption_fee = table.Column<decimal>(type: "numeric", nullable: true),
                    requires_home_visit = table.Column<bool>(type: "boolean", nullable: false),
                    views = table.Column<int>(type: "integer", nullable: false),
                    inquiries_count = table.Column<int>(type: "integer", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    adopted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pet_listings", x => x.id);
                    table.ForeignKey(
                        name: "FK_pet_listings_users_approved_by",
                        column: x => x.approved_by,
                        principalSchema: "development",
                        principalTable: "users",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_pet_listings_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "development",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pet_favorites",
                schema: "development",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    pet_listing_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pet_favorites", x => x.id);
                    table.ForeignKey(
                        name: "FK_pet_favorites_pet_listings_pet_listing_id",
                        column: x => x.pet_listing_id,
                        principalSchema: "development",
                        principalTable: "pet_listings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_pet_favorites_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "development",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pet_inquiries",
                schema: "development",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    pet_listing_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sender_id = table.Column<int>(type: "integer", nullable: false),
                    message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    parent_inquiry_id = table.Column<int>(type: "integer", nullable: true),
                    thread_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    is_read = table.Column<bool>(type: "boolean", nullable: false),
                    is_archived = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pet_inquiries", x => x.id);
                    table.ForeignKey(
                        name: "FK_pet_inquiries_pet_inquiries_parent_inquiry_id",
                        column: x => x.parent_inquiry_id,
                        principalSchema: "development",
                        principalTable: "pet_inquiries",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_pet_inquiries_pet_listings_pet_listing_id",
                        column: x => x.pet_listing_id,
                        principalSchema: "development",
                        principalTable: "pet_listings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_pet_inquiries_users_sender_id",
                        column: x => x.sender_id,
                        principalSchema: "development",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pet_photos",
                schema: "development",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    pet_listing_id = table.Column<Guid>(type: "uuid", nullable: false),
                    url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pet_photos", x => x.id);
                    table.ForeignKey(
                        name: "FK_pet_photos_pet_listings_pet_listing_id",
                        column: x => x.pet_listing_id,
                        principalSchema: "development",
                        principalTable: "pet_listings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_pet_favorites_pet_listing_id",
                schema: "development",
                table: "pet_favorites",
                column: "pet_listing_id");

            migrationBuilder.CreateIndex(
                name: "IX_pet_favorites_user_id",
                schema: "development",
                table: "pet_favorites",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_pet_inquiries_parent_inquiry_id",
                schema: "development",
                table: "pet_inquiries",
                column: "parent_inquiry_id");

            migrationBuilder.CreateIndex(
                name: "IX_pet_inquiries_pet_listing_id",
                schema: "development",
                table: "pet_inquiries",
                column: "pet_listing_id");

            migrationBuilder.CreateIndex(
                name: "IX_pet_inquiries_sender_id",
                schema: "development",
                table: "pet_inquiries",
                column: "sender_id");

            migrationBuilder.CreateIndex(
                name: "IX_pet_listings_approved_by",
                schema: "development",
                table: "pet_listings",
                column: "approved_by");

            migrationBuilder.CreateIndex(
                name: "IX_pet_listings_user_id",
                schema: "development",
                table: "pet_listings",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_pet_photos_pet_listing_id",
                schema: "development",
                table: "pet_photos",
                column: "pet_listing_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "pet_favorites",
                schema: "development");

            migrationBuilder.DropTable(
                name: "pet_inquiries",
                schema: "development");

            migrationBuilder.DropTable(
                name: "pet_photos",
                schema: "development");

            migrationBuilder.DropTable(
                name: "pet_listings",
                schema: "development");

            migrationBuilder.DropColumn(
                name: "auth_provider",
                schema: "development",
                table: "users");

            migrationBuilder.DropColumn(
                name: "failed_login_attempts",
                schema: "development",
                table: "users");

            migrationBuilder.DropColumn(
                name: "lockout_end",
                schema: "development",
                table: "users");

            migrationBuilder.DropColumn(
                name: "updated_at",
                schema: "development",
                table: "user_sessions");
        }
    }
}
