using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Onda.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RoomContinuity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AutoRecovery",
                table: "ListeningRooms",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Cohosts",
                table: "ListeningRooms",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "[]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AutoRecovery",
                table: "ListeningRooms");

            migrationBuilder.DropColumn(
                name: "Cohosts",
                table: "ListeningRooms");
        }
    }
}
