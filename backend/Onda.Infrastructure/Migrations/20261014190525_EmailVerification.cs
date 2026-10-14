using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Onda.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EmailVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "EmailVerificationExpiresAt",
                table: "ListenerAccounts",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmailVerificationHash",
                table: "ListenerAccounts",
                type: "varchar(64)",
                unicode: false,
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "EmailVerificationRequestedAt",
                table: "ListenerAccounts",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "EmailVerifiedAt",
                table: "ListenerAccounts",
                type: "datetimeoffset",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EmailVerificationExpiresAt",
                table: "ListenerAccounts");

            migrationBuilder.DropColumn(
                name: "EmailVerificationHash",
                table: "ListenerAccounts");

            migrationBuilder.DropColumn(
                name: "EmailVerificationRequestedAt",
                table: "ListenerAccounts");

            migrationBuilder.DropColumn(
                name: "EmailVerifiedAt",
                table: "ListenerAccounts");
        }
    }
}
