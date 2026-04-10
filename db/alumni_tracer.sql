-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 09, 2026 at 05:56 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `alumni_tracer`
--

-- --------------------------------------------------------

--
-- Table structure for table `alumni_records`
--

CREATE TABLE `alumni_records` (
  `id` int(11) NOT NULL,
  `student_id` varchar(20) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `suffix` varchar(10) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `program` varchar(100) NOT NULL,
  `batch_year` int(11) NOT NULL,
  `status` enum('active','inactive','graduated') DEFAULT 'active',
  `survey_status` enum('pending','completed') DEFAULT 'pending',
  `imported_by` int(11) DEFAULT NULL,
  `imported_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `program_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `alumni_records`
--

INSERT INTO `alumni_records` (`id`, `student_id`, `first_name`, `last_name`, `middle_name`, `suffix`, `email`, `program`, `batch_year`, `status`, `survey_status`, `imported_by`, `imported_at`, `program_id`) VALUES
(307, '24-00201', 'Zoren', 'Villanueva', 'Ocampo', NULL, 'zoren.villanueva@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 36),
(308, '24-00202', 'Iris', 'Garcia', 'Ocampo', NULL, 'iris.garcia@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 37),
(309, '24-00203', 'Noah ', 'Cruz', NULL, NULL, 'noah.cruz@plpasig.edu.ph', '', 2027, 'active', 'pending', NULL, '2026-03-14 08:36:53', 33),
(310, '24-00204', 'Enzo', 'Rivera', 'Balagtas', NULL, 'enzo.rivera@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 39),
(311, '24-00205', 'Ethan', 'Mendoza', NULL, NULL, 'ethan.mendoza@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 34),
(312, '24-00206', 'Mia ', 'Torres', NULL, NULL, 'mia.torres@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 33),
(313, '24-00207', 'Phoebe', 'Gonzales', 'Tiongson', NULL, 'phoebe.gonzales@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 39),
(314, '24-00208', 'Lianne', 'Reyes', 'Quimson', NULL, 'lianne.reyes@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 36),
(315, '24-00209', 'Enzo', 'Aquino', 'Javier', NULL, 'enzo.aquino@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 36),
(316, '24-00210', 'Charlotte ', 'Navarro', NULL, NULL, 'charlotte.navarro@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 35),
(317, '24-00211', 'Gianna', 'Ortega', 'Aguilar', NULL, 'gianna.ortega@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 36),
(318, '24-00212', 'Divine', 'Aquino', 'Herrera', 'III', 'divine.aquino@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 36),
(319, '24-00213', 'Ezekiel', 'Castillo', 'Ilagan', NULL, 'ezekiel.castillo@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 36),
(320, '24-00214', 'Harper ', 'Soriano', NULL, NULL, 'harper.soriano@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 34),
(321, '24-00215', 'Alexander ', 'Aquino', NULL, NULL, 'alexander.aquino@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 33),
(322, '24-00216', 'Daphne', 'Mabini', 'Quimson', NULL, 'daphne.mabini@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 36),
(323, '24-00217', 'Adrian', 'Valdez', 'Umali', 'III', 'adrian.valdez@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 39),
(324, '24-00218', 'Queenie', 'Mendoza', 'Herrera', 'III', 'queenie.mendoza@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 39),
(325, '24-00219', 'Warren', 'Mendoza', 'Manalo', 'Jr.', 'warren.mendoza@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 36),
(326, '24-00240', 'Olivia ', 'Herrera', NULL, NULL, 'olivia.herrera@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 34),
(327, '24-00220', 'Tristan', 'Aquino', 'Tiongson', NULL, 'tristan.aquino@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 39),
(328, '23-00221', 'Lianne', 'Mendoza', 'Vergara', NULL, 'lianne.mendoza@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 45),
(329, '23-00222', 'Cedric', 'Ramos', 'Cordero', NULL, 'cedric.ramos@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 46),
(330, '23-00223', 'Yohan', 'Villanueva', 'Ferrer', NULL, 'yohan.villanueva@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 45),
(331, '23-00224', 'Noel', 'Mabini', 'Ferrer', NULL, 'noel.mabini@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 47),
(332, '23-00225', 'Precious', 'Villanueva', 'Rosales', NULL, 'precious.villanueva@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 48),
(333, '23-00226', 'Nico', 'Ramos', 'Escobar', NULL, 'nico.ramos@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 45),
(334, '23-00227', 'Althea', 'Yap', 'Umali', NULL, 'althea.yap@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 48),
(335, '23-00228', 'Elijah', 'Bautista', 'Javier', NULL, 'elijah.bautista@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 47),
(336, '23-00229', 'Ivan', 'Reyes', 'Natividad', NULL, 'ivan.reyes@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 48),
(337, '23-00230', 'Carl', 'Cruz', 'Vergara', NULL, 'carl.cruz@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 45),
(338, '23-00231', 'Noel', 'Mabini', 'Escobar', NULL, 'noel.mabini2@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 46),
(339, '23-00232', 'Gian', 'Valdez', 'Manalo', 'Jr.', 'gian.valdez@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 46),
(340, '23-00233', 'Adrian', 'Valdez', 'Wenceslao', NULL, 'adrian.valdez2@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 45),
(341, '23-00234', 'Kyle', 'Dela Cruz', 'Ferrer', NULL, 'kyle.delacruz@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 45),
(342, '23-00235', 'Ysabel', 'Yap', 'Natividad', 'Jr.', 'ysabel.yap@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 47),
(343, '23-00236', 'Gian', 'Ortega', 'Rosales', NULL, 'gian.ortega@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 46),
(344, '23-00237', 'Gian', 'Domingo', 'Natividad', 'III', 'gian.domingo@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 45),
(345, '23-00238', 'Jasmine', 'Santos', 'Natividad', NULL, 'jasmine.santos@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 45),
(346, '23-00239', 'Warren', 'Mendoza', 'Wenceslao', NULL, 'warren.mendoza2@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 46),
(347, '23-00240', 'Joaquin', 'Ortega', 'Natividad', NULL, 'joaquin.ortega@plpasig.edu.ph', '', 2026, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 45),
(348, '24-00241', 'Jericho', 'Santos', 'Escobar', NULL, 'jericho.santos@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(349, '24-00242', 'Jasmine', 'Yap', 'Wenceslao', 'Jr.', 'jasmine.yap@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(350, '24-00243', 'Eunice', 'Luna', 'Alcantara', 'III', 'eunice.luna@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(351, '24-00244', 'Gelo', 'Cruz', 'Ilagan', NULL, 'gelo.cruz@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(352, '24-00245', 'Divine', 'Gonzales', 'Arellano', 'III', 'divine.gonzales@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(353, '24-00246', 'Xyra', 'Ortega', 'Manalo', NULL, 'xyra.ortega@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(354, '24-00247', 'Tricia', 'Ortega', 'Serrano', NULL, 'tricia.ortega@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(355, '24-00248', 'Divine', 'Ramos', 'Dizon', 'III', 'divine.ramos@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(356, '24-00249', 'Aubrey', 'Navarro', 'Ocampo', NULL, 'aubrey.navarro@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(357, '24-00250', 'Theo', 'Reyes', 'Escobar', 'Jr.', 'theo.reyes@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(358, '24-00251', 'Bea', 'De Guzman', 'Rosales', NULL, 'bea.deguzman@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(359, '24-00252', 'Chester', 'Castillo', 'Cordero', NULL, 'chester.castillo@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(360, '24-00253', 'Jericho', 'Bautista', 'Lopez', NULL, 'jericho.bautista@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(361, '24-00254', 'Mikaela', 'Reyes', 'Ilagan', 'Jr.', 'mikaela.reyes@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(362, '24-00255', 'Warren', 'Luna', 'Wenceslao', 'Jr.', 'warren.luna@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(363, '24-00256', 'Katrina', 'Salazar', 'Pineda', NULL, 'katrina.salazar@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(364, '24-00257', 'Francis', 'Hernandez', 'Serrano', 'Jr.', 'francis.hernandez@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(365, '24-00258', 'Zaira', 'Santos', 'Escobar', NULL, 'zaira.santos@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(366, '24-00259', 'Francesca', 'Santos', 'Escobar', NULL, 'francesca.santos@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(367, '24-00260', 'Miguel', 'Zamora', 'Aguilar', NULL, 'miguel.zamora@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 49),
(368, '24-00261', 'Roselle', 'Santos', 'Aguilar', NULL, 'roselle.santos@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 50),
(369, '24-00262', 'Theo', 'Flores', 'Balagtas', 'III', 'theo.flores@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 51),
(370, '24-00263', 'Samira', 'Aquino', 'Cordero', 'Jr.', 'samira.aquino@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 50),
(371, '24-00264', 'Eunice', 'Zamora', 'Aguilar', NULL, 'eunice.zamora@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 52),
(372, '24-00265', 'Sean', 'Domingo', 'Natividad', NULL, 'sean.domingo@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 51),
(373, '24-00266', 'Alden', 'Gutierrez', 'Aguilar', NULL, 'alden.gutierrez@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 52),
(374, '24-00267', 'Rico', 'Reyes', 'Tiongson', NULL, 'rico.reyes@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 51),
(375, '24-00268', 'Nico', 'Valdez', 'Javier', NULL, 'nico.valdez@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 50),
(376, '24-00269', 'Roselle', 'Mendoza', 'Tiongson', NULL, 'roselle.mendoza@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 50),
(377, '24-00270', 'Daphne', 'Mendoza', 'Arellano', NULL, 'daphne.mendoza@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 52),
(378, '24-00271', 'Kaye', 'Flores', 'Umali', NULL, 'kaye.flores@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 52),
(379, '24-00272', 'Heart', 'Flores', 'Manalo', 'III', 'heart.flores@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 51),
(380, '24-00273', 'Camille', 'Mabini', 'Ocampo', 'Jr.', 'camille.mabini@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 50),
(381, '24-00274', 'Luis', 'Ramos', 'Ilagan', 'Jr.', 'luis.ramos@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 52),
(382, '24-00275', 'Miguel', 'Navarro', 'Pineda', NULL, 'miguel.navarro@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 53),
(383, '24-00276', 'Jasmine', 'Gonzales', 'Quimson', NULL, 'jasmine.gonzales@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 52),
(384, '24-00277', 'Elijah', 'Ortega', 'Alcantara', NULL, 'elijah.ortega@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 50),
(385, '24-00278', 'Katrina', 'Ramos', 'Serrano', 'III', 'katrina.ramos@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 50),
(386, '24-00279', 'Precious', 'Reyes', 'Herrera', NULL, 'precious.reyes@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 53),
(387, '24-00280', 'Xyra', 'Hernandez', 'Lopez', NULL, 'xyra.hernandez@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 53),
(388, '24-00281', 'Divine', 'Santos', 'Escobar', NULL, 'divine.santos@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 54),
(389, '24-00282', 'Jericho', 'Torres', 'Aguilar', 'III', 'jericho.torres@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 54),
(390, '24-00283', 'Yohan', 'Luna', 'Quimson', NULL, 'yohan.luna@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 55),
(391, '24-00284', 'Vince', 'Pascual', 'Aguilar', NULL, 'vince.pascual@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 54),
(392, '24-00285', 'Phoebe', 'Flores', 'Arellano', NULL, 'phoebe.flores@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 54),
(393, '24-00286', 'Yohan', 'Luna', 'Wenceslao', NULL, 'yohan.luna2@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 55),
(394, '24-00287', 'Faith', 'Aquino', 'Wenceslao', NULL, 'faith.aquino@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 54),
(395, '24-00288', 'Nadine', 'Mabini', 'Alcantara', NULL, 'nadine.mabini@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 55),
(396, '24-00289', 'Renz', 'Pascual', 'Manalo', NULL, 'renz.pascual@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 54),
(397, '24-00290', 'Patricia', 'Salazar', 'Lopez', NULL, 'patricia.salazar@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 55),
(398, '24-00291', 'Gian', 'Ramos', 'Ocampo', NULL, 'gian.ramos@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 54),
(399, '24-00292', 'Francis', 'Gonzales', 'Alcantara', NULL, 'francis.gonzales@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 55),
(400, '24-00293', 'Mikaela', 'Ortega', 'Escobar', NULL, 'mikaela.ortega@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 55),
(401, '24-00294', 'Kaye', 'De Guzman', 'Serrano', NULL, 'kaye.deguzman@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 54),
(402, '24-00295', 'Sean', 'Villanueva', 'Herrera', NULL, 'sean.villanueva@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 54),
(403, '24-00296', 'Gabriel', 'Soriano', 'Javier', 'Jr.', 'gabriel.soriano@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 54),
(404, '24-00297', 'Tricia', 'Hernandez', 'Balagtas', NULL, 'tricia.hernandez@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 54),
(405, '24-00298', 'Enzo', 'Gonzales', 'Ferrer', NULL, 'enzo.gonzales@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 54),
(406, '24-00299', 'Renz', 'Salazar', 'Dizon', 'III', 'renz.salazar@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 54),
(407, '24-00300', 'Olivia', 'Gutierrez', 'Serrano', NULL, 'olivia.gutierrez@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 54),
(408, '24-00301', 'Alyssa', 'Santos', 'Ferrer', 'III', 'alyssa.santos@plpasig.edu.ph', '', 2027, 'active', 'pending', NULL, '2026-03-14 08:36:53', 56),
(409, '24-00302', 'Rafael', 'Garcia', 'Vergara', NULL, 'rafael.garcia@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 57),
(410, '24-00303', 'Christine', 'Salazar', 'Balagtas', 'III', 'christine.salazar@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 57),
(411, '24-00304', 'Alyssa', 'Salazar', 'Escobar', NULL, 'alyssa.salazar@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 57),
(412, '24-00306', 'Joshua', 'Padilla', 'Rizal', NULL, 'joshua.padilla@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 56),
(413, '24-00307', 'Rafael', 'Rivera', 'Escobar', 'Jr.', 'rafael.rivera@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 56),
(414, '24-00308', 'Angela', 'Ramos', 'Lazaro', NULL, 'angela.ramos@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 57),
(415, '24-00309', 'Renz', 'Bautista', 'Bonifacio', NULL, 'renz.bautista@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 56),
(416, '24-00310', 'Angela', 'Castillo', 'Ocampo', NULL, 'angela.castillo@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 56),
(417, '24-00312', 'Trisha', 'Mendoza', 'Del Rosario', NULL, 'trisha.mendoza@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 56),
(418, '24-00314', 'Camille', 'Bautista', 'Ocampo', NULL, 'camille.bautista@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 57),
(419, '24-00317', 'Renz', 'Flores', 'Ocampo', 'Jr.', 'renz.flores@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 57),
(420, '24-00318', 'Christine', 'Gutierrez', 'Mercado', 'III', 'christine.gutierrez@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:36:53', 56),
(421, '23-00201', 'Liam ', 'Santos', NULL, NULL, 'liam.santos@plpasig.edu.ph', '', 2027, 'active', 'completed', NULL, '2026-03-14 08:40:59', 33),
(422, '23-00202', 'Ava ', 'Ramirez', NULL, NULL, 'ava.ramirez@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 34),
(423, '23-00203', 'Noah ', 'Cruz', NULL, NULL, 'noah.cruz@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 33),
(424, '23-00204', 'Isabella ', 'Garcia', NULL, NULL, 'isabella.garcia@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 35),
(425, '23-00205', 'Ethan', 'Mendoza', NULL, NULL, 'ethan.mendoza@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 34),
(426, '23-00206', 'Mia ', 'Torres', NULL, NULL, 'mia.torres@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 33),
(427, '23-00207', 'Lucas ', 'Flores', NULL, NULL, 'lucas.flores@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 35),
(428, '23-00208', 'Sophia ', 'Reyes', NULL, NULL, 'sophia.reyes@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 34),
(429, '23-00209', 'James ', 'Buatista', NULL, NULL, 'james.bautista@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 33),
(430, '23-00210', 'Charlotte ', 'Navarro', NULL, NULL, 'charlotte.navarro@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 35),
(431, '23-00211', 'Benjamin ', 'Castillo', NULL, NULL, 'benjamin.castillo@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 34),
(432, '23-00212', 'Amelia ', 'Delgado', NULL, NULL, 'amelia.delgado@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 33),
(433, '23-00213', 'Henry ', 'Villanueva', NULL, NULL, 'henry.villanueva@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 35),
(434, '23-00214', 'Harper ', 'Soriano', NULL, NULL, 'harper.soriano@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 34),
(435, '23-00215', 'Alexander ', 'Aquino', NULL, NULL, 'alexander.aquino@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 33),
(436, '23-00216', 'Evelyn', 'Domiquez', NULL, NULL, 'evelyn.dominguez@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 35),
(437, '23-00217', 'Michael ', 'Salazar', NULL, NULL, 'michael.salazar@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 34),
(438, '23-00218', 'Abigail ', 'Padilla', NULL, NULL, 'abigail.padilla@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 33),
(439, '23-00219', 'Daniel ', 'Pineda', NULL, NULL, 'daniel.pineda@plpasig.edu.ph', '', 2027, 'inactive', 'pending', NULL, '2026-03-14 08:40:59', 35),
(440, '25-00006', 'Alumni', '25-00006', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(441, '25-00012', 'Alumni', '25-00012', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(442, '25-00026', 'Alumni', '25-00026', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(443, '25-00028', 'Alumni', '25-00028', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(444, '25-00030', 'Alumni', '25-00030', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(445, '25-00032', 'Alumni', '25-00032', NULL, NULL, NULL, 'BSBA-Marketing', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(446, '25-00043', 'Alumni', '25-00043', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(447, '25-00044', 'Alumni', '25-00044', NULL, NULL, NULL, 'BSEd-Filipino', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(448, '25-00058', 'Alumni', '25-00058', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(449, '25-00065', 'Alumni', '25-00065', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(450, '25-00072', 'Alumni', '25-00072', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(451, '25-00073', 'Alumni', '25-00073', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(452, '25-00074', 'Alumni', '25-00074', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(453, '25-00092', 'Alumni', '25-00092', NULL, NULL, NULL, 'BSBA-Marketing', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(454, '25-00093', 'Alumni', '25-00093', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(455, '25-00095', 'Alumni', '25-00095', NULL, NULL, NULL, 'BSEd-Filipino', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(456, '25-00099', 'Alumni', '25-00099', NULL, NULL, NULL, 'BSA', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(457, '25-00100', 'Alumni', '25-00100', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(458, '25-00105', 'Alumni', '25-00105', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(459, '25-00106', 'Alumni', '25-00106', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(460, '25-00119', 'Alumni', '25-00119', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(461, '25-00124', 'Alumni', '25-00124', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(462, '25-00140', 'Alumni', '25-00140', NULL, NULL, NULL, 'BSCS', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(463, '25-00156', 'Alumni', '25-00156', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(464, '25-00160', 'Alumni', '25-00160', NULL, NULL, NULL, 'BSEd-Filipino', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(465, '25-00165', 'Alumni', '25-00165', NULL, NULL, NULL, 'BSEd-English', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(466, '25-00175', 'Alumni', '25-00175', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(467, '25-00179', 'Alumni', '25-00179', NULL, NULL, NULL, 'BSA', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(468, '25-00184', 'Alumni', '25-00184', NULL, NULL, NULL, 'BSCS', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(469, '25-00189', 'Alumni', '25-00189', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(470, '25-00218', 'Alumni', '25-00218', NULL, NULL, NULL, 'BSCS', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(471, '25-00229', 'Alumni', '25-00229', NULL, NULL, NULL, 'BSEd-Filipino', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(472, '25-00235', 'Alumni', '25-00235', NULL, NULL, NULL, 'BSEd-Filipino', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(473, '25-00259', 'Alumni', '25-00259', NULL, NULL, NULL, 'BSA', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(474, '25-00270', 'Alumni', '25-00270', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(475, '25-00274', 'Alumni', '25-00274', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(476, '25-00290', 'Alumni', '25-00290', NULL, NULL, NULL, 'BSCS', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(477, '25-00291', 'Alumni', '25-00291', NULL, NULL, NULL, 'BSBA-Marketing', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(478, '25-00301', 'Alumni', '25-00301', NULL, NULL, NULL, 'BSCS', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(479, '25-00302', 'Alumni', '25-00302', NULL, NULL, NULL, 'BSEd-Filipino', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(480, '25-00309', 'Alumni', '25-00309', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(481, '25-00325', 'Alumni', '25-00325', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(482, '25-00328', 'Alumni', '25-00328', NULL, NULL, NULL, 'BSEd-English', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(483, '25-00332', 'Alumni', '25-00332', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(484, '25-00335', 'Alumni', '25-00335', NULL, NULL, NULL, 'BSCS', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(485, '25-00338', 'Alumni', '25-00338', NULL, NULL, NULL, 'BSEd-English', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(486, '25-00354', 'Alumni', '25-00354', NULL, NULL, NULL, 'BSBA-Marketing', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(487, '25-00356', 'Alumni', '25-00356', NULL, NULL, NULL, 'BSCS', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(488, '25-00358', 'Alumni', '25-00358', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(489, '25-00361', 'Alumni', '25-00361', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(490, '25-00362', 'Alumni', '25-00362', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(491, '25-00367', 'Alumni', '25-00367', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(492, '25-00368', 'Alumni', '25-00368', NULL, NULL, NULL, 'BSCS', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(493, '25-00378', 'Alumni', '25-00378', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(494, '25-00388', 'Alumni', '25-00388', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(495, '25-00394', 'Alumni', '25-00394', NULL, NULL, NULL, 'BSA', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(496, '25-00409', 'Alumni', '25-00409', NULL, NULL, NULL, 'BSBA-Marketing', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(497, '25-00415', 'Alumni', '25-00415', NULL, NULL, NULL, 'BSBA-Marketing', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(498, '25-00417', 'Alumni', '25-00417', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(499, '25-00430', 'Alumni', '25-00430', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(500, '25-00439', 'Alumni', '25-00439', NULL, NULL, NULL, 'BSEd-English', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(501, '25-00442', 'Alumni', '25-00442', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(502, '25-00449', 'Alumni', '25-00449', NULL, NULL, NULL, 'BSCS', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(503, '25-00450', 'Alumni', '25-00450', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(504, '25-00473', 'Alumni', '25-00473', NULL, NULL, NULL, 'BSBA-Marketing', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(505, '25-00480', 'Alumni', '25-00480', NULL, NULL, NULL, 'BSA', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(506, '25-00487', 'Alumni', '25-00487', NULL, NULL, NULL, 'BSIT', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(507, '25-00489', 'Alumni', '25-00489', NULL, NULL, NULL, 'BSCS', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(508, '25-00491', 'Alumni', '25-00491', NULL, NULL, NULL, 'BSCS', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(509, '25-00497', 'Alumni', '25-00497', NULL, NULL, NULL, 'BSEd-Filipino', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(510, '25-00498', 'Alumni', '25-00498', NULL, NULL, NULL, 'BSCS', 2018, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(511, '25-00004', 'Alumni', '25-00004', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(512, '25-00005', 'Alumni', '25-00005', NULL, NULL, NULL, 'BSEd-Filipino', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(513, '25-00007', 'Alumni', '25-00007', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(514, '25-00013', 'Alumni', '25-00013', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(515, '25-00014', 'Alumni', '25-00014', NULL, NULL, NULL, 'BSA', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(516, '25-00017', 'Alumni', '25-00017', NULL, NULL, NULL, 'BSA', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(517, '25-00020', 'Alumni', '25-00020', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(518, '25-00021', 'Alumni', '25-00021', NULL, NULL, NULL, 'BSCS', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(519, '25-00023', 'Alumni', '25-00023', NULL, NULL, NULL, 'BSBA-Marketing', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(520, '25-00024', 'Alumni', '25-00024', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(521, '25-00045', 'Alumni', '25-00045', NULL, NULL, NULL, 'BSEd-Filipino', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(522, '25-00055', 'Alumni', '25-00055', NULL, NULL, NULL, 'BSCS', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(523, '25-00057', 'Alumni', '25-00057', NULL, NULL, NULL, 'BSEd-English', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(524, '25-00075', 'Alumni', '25-00075', NULL, NULL, NULL, 'BSEd-English', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(525, '25-00077', 'Alumni', '25-00077', NULL, NULL, NULL, 'BSBA-Marketing', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(526, '25-00087', 'Alumni', '25-00087', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(527, '25-00088', 'Alumni', '25-00088', NULL, NULL, NULL, 'BSCS', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(528, '25-00107', 'Alumni', '25-00107', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(529, '25-00112', 'Alumni', '25-00112', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(530, '25-00114', 'Alumni', '25-00114', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(531, '25-00122', 'Alumni', '25-00122', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(532, '25-00139', 'Alumni', '25-00139', NULL, NULL, NULL, 'BSEd-Filipino', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(533, '25-00163', 'Alumni', '25-00163', NULL, NULL, NULL, 'BSCS', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(534, '25-00164', 'Alumni', '25-00164', NULL, NULL, NULL, 'BSEd-Filipino', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(535, '25-00167', 'Alumni', '25-00167', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(536, '25-00191', 'Alumni', '25-00191', NULL, NULL, NULL, 'BSCS', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(537, '25-00196', 'Alumni', '25-00196', NULL, NULL, NULL, 'BSEd-Filipino', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(538, '25-00197', 'Alumni', '25-00197', NULL, NULL, NULL, 'BSEd-Filipino', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(539, '25-00202', 'Alumni', '25-00202', NULL, NULL, NULL, 'BSA', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(540, '25-00210', 'Alumni', '25-00210', NULL, NULL, NULL, 'BSCS', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(541, '25-00212', 'Alumni', '25-00212', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(542, '25-00220', 'Alumni', '25-00220', NULL, NULL, NULL, 'BSEd-Filipino', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(543, '25-00222', 'Alumni', '25-00222', NULL, NULL, NULL, 'BSA', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(544, '25-00231', 'Alumni', '25-00231', NULL, NULL, NULL, 'BSEd-English', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(545, '25-00238', 'Alumni', '25-00238', NULL, NULL, NULL, 'BSCS', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(546, '25-00241', 'Alumni', '25-00241', NULL, NULL, NULL, 'BSBA-Marketing', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(547, '25-00242', 'Alumni', '25-00242', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(548, '25-00256', 'Alumni', '25-00256', NULL, NULL, NULL, 'BSCS', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(549, '25-00260', 'Alumni', '25-00260', NULL, NULL, NULL, 'BSCS', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(550, '25-00271', 'Alumni', '25-00271', NULL, NULL, NULL, 'BSBA-Marketing', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(551, '25-00283', 'Alumni', '25-00283', NULL, NULL, NULL, 'BSCS', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(552, '25-00296', 'Alumni', '25-00296', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(553, '25-00300', 'Alumni', '25-00300', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(554, '25-00316', 'Alumni', '25-00316', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(555, '25-00326', 'Alumni', '25-00326', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(556, '25-00336', 'Alumni', '25-00336', NULL, NULL, NULL, 'BSA', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(557, '25-00337', 'Alumni', '25-00337', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(558, '25-00365', 'Alumni', '25-00365', NULL, NULL, NULL, 'BSEd-English', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(559, '25-00369', 'Alumni', '25-00369', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(560, '25-00379', 'Alumni', '25-00379', NULL, NULL, NULL, 'BSEd-English', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(561, '25-00395', 'Alumni', '25-00395', NULL, NULL, NULL, 'BSCS', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(562, '25-00401', 'Alumni', '25-00401', NULL, NULL, NULL, 'BSEd-English', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(563, '25-00403', 'Alumni', '25-00403', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(564, '25-00408', 'Alumni', '25-00408', NULL, NULL, NULL, 'BSCS', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(565, '25-00411', 'Alumni', '25-00411', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(566, '25-00427', 'Alumni', '25-00427', NULL, NULL, NULL, 'BSEd-English', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(567, '25-00431', 'Alumni', '25-00431', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(568, '25-00460', 'Alumni', '25-00460', NULL, NULL, NULL, 'BSCS', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(569, '25-00462', 'Alumni', '25-00462', NULL, NULL, NULL, 'BSCS', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(570, '25-00479', 'Alumni', '25-00479', NULL, NULL, NULL, 'BSCS', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(571, '25-00490', 'Alumni', '25-00490', NULL, NULL, NULL, 'BSIT', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(572, '25-00493', 'Alumni', '25-00493', NULL, NULL, NULL, 'BSCS', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(573, '25-00495', 'Alumni', '25-00495', NULL, NULL, NULL, 'BSA', 2019, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(574, '25-00001', 'Alumni', '25-00001', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(575, '25-00010', 'Alumni', '25-00010', NULL, NULL, NULL, 'BSCS', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(576, '25-00019', 'Alumni', '25-00019', NULL, NULL, NULL, 'BSCS', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(577, '25-00035', 'Alumni', '25-00035', NULL, NULL, NULL, 'BSA', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(578, '25-00059', 'Alumni', '25-00059', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(579, '25-00084', 'Alumni', '25-00084', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(580, '25-00086', 'Alumni', '25-00086', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(581, '25-00094', 'Alumni', '25-00094', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(582, '25-00101', 'Alumni', '25-00101', NULL, NULL, NULL, 'BSCS', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(583, '25-00102', 'Alumni', '25-00102', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(584, '25-00108', 'Alumni', '25-00108', NULL, NULL, NULL, 'BSBA-Marketing', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(585, '25-00110', 'Alumni', '25-00110', NULL, NULL, NULL, 'BSEd-Filipino', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(586, '25-00111', 'Alumni', '25-00111', NULL, NULL, NULL, 'BSEd-Filipino', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(587, '25-00121', 'Alumni', '25-00121', NULL, NULL, NULL, 'BSEd-English', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(588, '25-00134', 'Alumni', '25-00134', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(589, '25-00151', 'Alumni', '25-00151', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(590, '25-00168', 'Alumni', '25-00168', NULL, NULL, NULL, 'BSCS', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(591, '25-00172', 'Alumni', '25-00172', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(592, '25-00180', 'Alumni', '25-00180', NULL, NULL, NULL, 'BSCS', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(593, '25-00221', 'Alumni', '25-00221', NULL, NULL, NULL, 'BSEd-Filipino', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(594, '25-00225', 'Alumni', '25-00225', NULL, NULL, NULL, 'BSA', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(595, '25-00233', 'Alumni', '25-00233', NULL, NULL, NULL, 'BSEd-English', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(596, '25-00245', 'Alumni', '25-00245', NULL, NULL, NULL, 'BSCS', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(597, '25-00248', 'Alumni', '25-00248', NULL, NULL, NULL, 'BSEd-Filipino', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(598, '25-00249', 'Alumni', '25-00249', NULL, NULL, NULL, 'BSEd-English', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(599, '25-00253', 'Alumni', '25-00253', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(600, '25-00254', 'Alumni', '25-00254', NULL, NULL, NULL, 'BSCS', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(601, '25-00261', 'Alumni', '25-00261', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(602, '25-00265', 'Alumni', '25-00265', NULL, NULL, NULL, 'BSCS', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(603, '25-00266', 'Alumni', '25-00266', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(604, '25-00272', 'Alumni', '25-00272', NULL, NULL, NULL, 'BSCS', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(605, '25-00277', 'Alumni', '25-00277', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(606, '25-00280', 'Alumni', '25-00280', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(607, '25-00284', 'Alumni', '25-00284', NULL, NULL, NULL, 'BSEd-Filipino', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(608, '25-00285', 'Alumni', '25-00285', NULL, NULL, NULL, 'BSCS', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(609, '25-00287', 'Alumni', '25-00287', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(610, '25-00304', 'Alumni', '25-00304', NULL, NULL, NULL, 'BSBA-Marketing', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(611, '25-00315', 'Alumni', '25-00315', NULL, NULL, NULL, 'BSEd-Filipino', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(612, '25-00317', 'Alumni', '25-00317', NULL, NULL, NULL, 'BSA', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(613, '25-00334', 'Alumni', '25-00334', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(614, '25-00340', 'Alumni', '25-00340', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(615, '25-00343', 'Alumni', '25-00343', NULL, NULL, NULL, 'BSEd-Filipino', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(616, '25-00353', 'Alumni', '25-00353', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(617, '25-00359', 'Alumni', '25-00359', NULL, NULL, NULL, 'BSCS', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(618, '25-00373', 'Alumni', '25-00373', NULL, NULL, NULL, 'BSEd-English', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(619, '25-00385', 'Alumni', '25-00385', NULL, NULL, NULL, 'BSEd-Filipino', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(620, '25-00386', 'Alumni', '25-00386', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(621, '25-00389', 'Alumni', '25-00389', NULL, NULL, NULL, 'BSBA-Marketing', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(622, '25-00391', 'Alumni', '25-00391', NULL, NULL, NULL, 'BSCS', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(623, '25-00397', 'Alumni', '25-00397', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(624, '25-00398', 'Alumni', '25-00398', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(625, '25-00414', 'Alumni', '25-00414', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(626, '25-00424', 'Alumni', '25-00424', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(627, '25-00428', 'Alumni', '25-00428', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(628, '25-00444', 'Alumni', '25-00444', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(629, '25-00445', 'Alumni', '25-00445', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(630, '25-00446', 'Alumni', '25-00446', NULL, NULL, NULL, 'BSCS', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(631, '25-00454', 'Alumni', '25-00454', NULL, NULL, NULL, 'BSCS', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(632, '25-00456', 'Alumni', '25-00456', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(633, '25-00461', 'Alumni', '25-00461', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(634, '25-00463', 'Alumni', '25-00463', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(635, '25-00478', 'Alumni', '25-00478', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(636, '25-00483', 'Alumni', '25-00483', NULL, NULL, NULL, 'BSEd-Filipino', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(637, '25-00492', 'Alumni', '25-00492', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(638, '25-00499', 'Alumni', '25-00499', NULL, NULL, NULL, 'BSIT', 2020, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(639, '25-00008', 'Alumni', '25-00008', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(640, '25-00009', 'Alumni', '25-00009', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(641, '25-00011', 'Alumni', '25-00011', NULL, NULL, NULL, 'BSEd-Filipino', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(642, '25-00031', 'Alumni', '25-00031', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(643, '25-00040', 'Alumni', '25-00040', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(644, '25-00053', 'Alumni', '25-00053', NULL, NULL, NULL, 'BSA', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(645, '25-00061', 'Alumni', '25-00061', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(646, '25-00068', 'Alumni', '25-00068', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(647, '25-00071', 'Alumni', '25-00071', NULL, NULL, NULL, 'BSEd-Filipino', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(648, '25-00076', 'Alumni', '25-00076', NULL, NULL, NULL, 'BSBA-Marketing', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(649, '25-00103', 'Alumni', '25-00103', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(650, '25-00115', 'Alumni', '25-00115', NULL, NULL, NULL, 'BSEd-English', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(651, '25-00117', 'Alumni', '25-00117', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(652, '25-00118', 'Alumni', '25-00118', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(653, '25-00120', 'Alumni', '25-00120', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(654, '25-00125', 'Alumni', '25-00125', NULL, NULL, NULL, 'BSEd-Filipino', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(655, '25-00127', 'Alumni', '25-00127', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(656, '25-00133', 'Alumni', '25-00133', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(657, '25-00155', 'Alumni', '25-00155', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL);
INSERT INTO `alumni_records` (`id`, `student_id`, `first_name`, `last_name`, `middle_name`, `suffix`, `email`, `program`, `batch_year`, `status`, `survey_status`, `imported_by`, `imported_at`, `program_id`) VALUES
(658, '25-00161', 'Alumni', '25-00161', NULL, NULL, NULL, 'BSBA-Marketing', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(659, '25-00170', 'Alumni', '25-00170', NULL, NULL, NULL, 'BSEd-Filipino', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(660, '25-00183', 'Alumni', '25-00183', NULL, NULL, NULL, 'BSA', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(661, '25-00190', 'Alumni', '25-00190', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(662, '25-00195', 'Alumni', '25-00195', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(663, '25-00206', 'Alumni', '25-00206', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(664, '25-00207', 'Alumni', '25-00207', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(665, '25-00214', 'Alumni', '25-00214', NULL, NULL, NULL, 'BSBA-Marketing', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(666, '25-00216', 'Alumni', '25-00216', NULL, NULL, NULL, 'BSBA-Marketing', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(667, '25-00230', 'Alumni', '25-00230', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(668, '25-00246', 'Alumni', '25-00246', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(669, '25-00247', 'Alumni', '25-00247', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(670, '25-00255', 'Alumni', '25-00255', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(671, '25-00258', 'Alumni', '25-00258', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(672, '25-00262', 'Alumni', '25-00262', NULL, NULL, NULL, 'BSEd-English', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(673, '25-00263', 'Alumni', '25-00263', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(674, '25-00267', 'Alumni', '25-00267', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(675, '25-00275', 'Alumni', '25-00275', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(676, '25-00289', 'Alumni', '25-00289', NULL, NULL, NULL, 'BSA', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(677, '25-00293', 'Alumni', '25-00293', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(678, '25-00294', 'Alumni', '25-00294', NULL, NULL, NULL, 'BSBA-Marketing', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(679, '25-00297', 'Alumni', '25-00297', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(680, '25-00298', 'Alumni', '25-00298', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(681, '25-00310', 'Alumni', '25-00310', NULL, NULL, NULL, 'BSBA-Marketing', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(682, '25-00313', 'Alumni', '25-00313', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(683, '25-00323', 'Alumni', '25-00323', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(684, '25-00327', 'Alumni', '25-00327', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(685, '25-00344', 'Alumni', '25-00344', NULL, NULL, NULL, 'BSEd-Filipino', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(686, '25-00349', 'Alumni', '25-00349', NULL, NULL, NULL, 'BSA', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(687, '25-00350', 'Alumni', '25-00350', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(688, '25-00360', 'Alumni', '25-00360', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(689, '25-00364', 'Alumni', '25-00364', NULL, NULL, NULL, 'BSA', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(690, '25-00374', 'Alumni', '25-00374', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(691, '25-00375', 'Alumni', '25-00375', NULL, NULL, NULL, 'BSEd-Filipino', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(692, '25-00384', 'Alumni', '25-00384', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(693, '25-00390', 'Alumni', '25-00390', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(694, '25-00406', 'Alumni', '25-00406', NULL, NULL, NULL, 'BSEd-English', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(695, '25-00407', 'Alumni', '25-00407', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(696, '25-00423', 'Alumni', '25-00423', NULL, NULL, NULL, 'BSEd-Filipino', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(697, '25-00425', 'Alumni', '25-00425', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(698, '25-00433', 'Alumni', '25-00433', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(699, '25-00435', 'Alumni', '25-00435', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(700, '25-00437', 'Alumni', '25-00437', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(701, '25-00447', 'Alumni', '25-00447', NULL, NULL, NULL, 'BSIT', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(702, '25-00457', 'Alumni', '25-00457', NULL, NULL, NULL, 'BSCS', 2021, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(703, '25-00002', 'Alumni', '25-00002', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(704, '25-00003', 'Alumni', '25-00003', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(705, '25-00015', 'Alumni', '25-00015', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(706, '25-00022', 'Alumni', '25-00022', NULL, NULL, NULL, 'BSA', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(707, '25-00036', 'Alumni', '25-00036', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(708, '25-00049', 'Alumni', '25-00049', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(709, '25-00050', 'Alumni', '25-00050', NULL, NULL, NULL, 'BSA', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(710, '25-00054', 'Alumni', '25-00054', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(711, '25-00056', 'Alumni', '25-00056', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(712, '25-00060', 'Alumni', '25-00060', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(713, '25-00066', 'Alumni', '25-00066', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(714, '25-00078', 'Alumni', '25-00078', NULL, NULL, NULL, 'BSA', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(715, '25-00079', 'Alumni', '25-00079', NULL, NULL, NULL, 'BSA', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(716, '25-00082', 'Alumni', '25-00082', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(717, '25-00085', 'Alumni', '25-00085', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(718, '25-00097', 'Alumni', '25-00097', NULL, NULL, NULL, 'BSEd-Filipino', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(719, '25-00129', 'Alumni', '25-00129', NULL, NULL, NULL, 'BSEd-English', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(720, '25-00130', 'Alumni', '25-00130', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(721, '25-00132', 'Alumni', '25-00132', NULL, NULL, NULL, 'BSA', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(722, '25-00146', 'Alumni', '25-00146', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(723, '25-00147', 'Alumni', '25-00147', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(724, '25-00149', 'Alumni', '25-00149', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(725, '25-00150', 'Alumni', '25-00150', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(726, '25-00157', 'Alumni', '25-00157', NULL, NULL, NULL, 'BSBA-Marketing', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(727, '25-00158', 'Alumni', '25-00158', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(728, '25-00162', 'Alumni', '25-00162', NULL, NULL, NULL, 'BSEd-English', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(729, '25-00169', 'Alumni', '25-00169', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(730, '25-00173', 'Alumni', '25-00173', NULL, NULL, NULL, 'BSEd-Filipino', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(731, '25-00174', 'Alumni', '25-00174', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(732, '25-00182', 'Alumni', '25-00182', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(733, '25-00185', 'Alumni', '25-00185', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(734, '25-00198', 'Alumni', '25-00198', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(735, '25-00203', 'Alumni', '25-00203', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(736, '25-00211', 'Alumni', '25-00211', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(737, '25-00226', 'Alumni', '25-00226', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(738, '25-00227', 'Alumni', '25-00227', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(739, '25-00228', 'Alumni', '25-00228', NULL, NULL, NULL, 'BSA', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(740, '25-00237', 'Alumni', '25-00237', NULL, NULL, NULL, 'BSA', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(741, '25-00239', 'Alumni', '25-00239', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(742, '25-00268', 'Alumni', '25-00268', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(743, '25-00269', 'Alumni', '25-00269', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(744, '25-00278', 'Alumni', '25-00278', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(745, '25-00292', 'Alumni', '25-00292', NULL, NULL, NULL, 'BSBA-Marketing', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(746, '25-00295', 'Alumni', '25-00295', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(747, '25-00303', 'Alumni', '25-00303', NULL, NULL, NULL, 'BSEd-Filipino', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(748, '25-00305', 'Alumni', '25-00305', NULL, NULL, NULL, 'BSEd-English', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(749, '25-00308', 'Alumni', '25-00308', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(750, '25-00311', 'Alumni', '25-00311', NULL, NULL, NULL, 'BSBA-Marketing', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(751, '25-00318', 'Alumni', '25-00318', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(752, '25-00324', 'Alumni', '25-00324', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(753, '25-00348', 'Alumni', '25-00348', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(754, '25-00351', 'Alumni', '25-00351', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(755, '25-00357', 'Alumni', '25-00357', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(756, '25-00366', 'Alumni', '25-00366', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(757, '25-00377', 'Alumni', '25-00377', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(758, '25-00383', 'Alumni', '25-00383', NULL, NULL, NULL, 'BSEd-English', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(759, '25-00393', 'Alumni', '25-00393', NULL, NULL, NULL, 'BSBA-Marketing', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(760, '25-00396', 'Alumni', '25-00396', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(761, '25-00400', 'Alumni', '25-00400', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(762, '25-00404', 'Alumni', '25-00404', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(763, '25-00410', 'Alumni', '25-00410', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(764, '25-00412', 'Alumni', '25-00412', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(765, '25-00413', 'Alumni', '25-00413', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(766, '25-00420', 'Alumni', '25-00420', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(767, '25-00421', 'Alumni', '25-00421', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(768, '25-00422', 'Alumni', '25-00422', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(769, '25-00434', 'Alumni', '25-00434', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(770, '25-00436', 'Alumni', '25-00436', NULL, NULL, NULL, 'BSBA-Marketing', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(771, '25-00440', 'Alumni', '25-00440', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(772, '25-00443', 'Alumni', '25-00443', NULL, NULL, NULL, 'BSA', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(773, '25-00451', 'Alumni', '25-00451', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(774, '25-00458', 'Alumni', '25-00458', NULL, NULL, NULL, 'BSEd-English', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(775, '25-00465', 'Alumni', '25-00465', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(776, '25-00467', 'Alumni', '25-00467', NULL, NULL, NULL, 'BSEd-Filipino', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(777, '25-00471', 'Alumni', '25-00471', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(778, '25-00472', 'Alumni', '25-00472', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(779, '25-00474', 'Alumni', '25-00474', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(780, '25-00475', 'Alumni', '25-00475', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(781, '25-00476', 'Alumni', '25-00476', NULL, NULL, NULL, 'BSBA-Marketing', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(782, '25-00477', 'Alumni', '25-00477', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(783, '25-00488', 'Alumni', '25-00488', NULL, NULL, NULL, 'BSCS', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(784, '25-00494', 'Alumni', '25-00494', NULL, NULL, NULL, 'BSIT', 2022, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(785, '25-00016', 'Alumni', '25-00016', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(786, '25-00018', 'Alumni', '25-00018', NULL, NULL, NULL, 'BSEd-English', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(787, '25-00027', 'Alumni', '25-00027', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(788, '25-00037', 'Alumni', '25-00037', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(789, '25-00041', 'Alumni', '25-00041', NULL, NULL, NULL, 'BSBA-Marketing', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(790, '25-00046', 'Alumni', '25-00046', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(791, '25-00047', 'Alumni', '25-00047', NULL, NULL, NULL, 'BSA', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(792, '25-00064', 'Alumni', '25-00064', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(793, '25-00067', 'Alumni', '25-00067', NULL, NULL, NULL, 'BSA', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(794, '25-00069', 'Alumni', '25-00069', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(795, '25-00080', 'Alumni', '25-00080', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(796, '25-00081', 'Alumni', '25-00081', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(797, '25-00090', 'Alumni', '25-00090', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(798, '25-00098', 'Alumni', '25-00098', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(799, '25-00116', 'Alumni', '25-00116', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(800, '25-00135', 'Alumni', '25-00135', NULL, NULL, NULL, 'BSBA-Marketing', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(801, '25-00136', 'Alumni', '25-00136', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(802, '25-00138', 'Alumni', '25-00138', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(803, '25-00141', 'Alumni', '25-00141', NULL, NULL, NULL, 'BSA', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(804, '25-00142', 'Alumni', '25-00142', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(805, '25-00144', 'Alumni', '25-00144', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(806, '25-00148', 'Alumni', '25-00148', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(807, '25-00152', 'Alumni', '25-00152', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(808, '25-00159', 'Alumni', '25-00159', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(809, '25-00166', 'Alumni', '25-00166', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(810, '25-00171', 'Alumni', '25-00171', NULL, NULL, NULL, 'BSEd-Filipino', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(811, '25-00176', 'Alumni', '25-00176', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(812, '25-00177', 'Alumni', '25-00177', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(813, '25-00178', 'Alumni', '25-00178', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(814, '25-00186', 'Alumni', '25-00186', NULL, NULL, NULL, 'BSEd-Filipino', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(815, '25-00187', 'Alumni', '25-00187', NULL, NULL, NULL, 'BSEd-Filipino', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(816, '25-00188', 'Alumni', '25-00188', NULL, NULL, NULL, 'BSEd-Filipino', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(817, '25-00192', 'Alumni', '25-00192', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(818, '25-00193', 'Alumni', '25-00193', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(819, '25-00199', 'Alumni', '25-00199', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(820, '25-00201', 'Alumni', '25-00201', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(821, '25-00205', 'Alumni', '25-00205', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(822, '25-00208', 'Alumni', '25-00208', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(823, '25-00209', 'Alumni', '25-00209', NULL, NULL, NULL, 'BSEd-English', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(824, '25-00213', 'Alumni', '25-00213', NULL, NULL, NULL, 'BSA', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(825, '25-00215', 'Alumni', '25-00215', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(826, '25-00219', 'Alumni', '25-00219', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(827, '25-00224', 'Alumni', '25-00224', NULL, NULL, NULL, 'BSA', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(828, '25-00232', 'Alumni', '25-00232', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(829, '25-00236', 'Alumni', '25-00236', NULL, NULL, NULL, 'BSBA-Marketing', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(830, '25-00244', 'Alumni', '25-00244', NULL, NULL, NULL, 'BSA', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(831, '25-00257', 'Alumni', '25-00257', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(832, '25-00276', 'Alumni', '25-00276', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(833, '25-00279', 'Alumni', '25-00279', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(834, '25-00286', 'Alumni', '25-00286', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(835, '25-00288', 'Alumni', '25-00288', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(836, '25-00312', 'Alumni', '25-00312', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(837, '25-00320', 'Alumni', '25-00320', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(838, '25-00322', 'Alumni', '25-00322', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(839, '25-00331', 'Alumni', '25-00331', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(840, '25-00339', 'Alumni', '25-00339', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(841, '25-00342', 'Alumni', '25-00342', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(842, '25-00345', 'Alumni', '25-00345', NULL, NULL, NULL, 'BSA', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(843, '25-00346', 'Alumni', '25-00346', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(844, '25-00352', 'Alumni', '25-00352', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(845, '25-00363', 'Alumni', '25-00363', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(846, '25-00371', 'Alumni', '25-00371', NULL, NULL, NULL, 'BSEd-Filipino', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(847, '25-00372', 'Alumni', '25-00372', NULL, NULL, NULL, 'BSEd-Filipino', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(848, '25-00381', 'Alumni', '25-00381', NULL, NULL, NULL, 'BSEd-English', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(849, '25-00399', 'Alumni', '25-00399', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(850, '25-00402', 'Alumni', '25-00402', NULL, NULL, NULL, 'BSA', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(851, '25-00405', 'Alumni', '25-00405', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(852, '25-00419', 'Alumni', '25-00419', NULL, NULL, NULL, 'BSEd-English', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(853, '25-00438', 'Alumni', '25-00438', NULL, NULL, NULL, 'BSEd-English', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(854, '25-00441', 'Alumni', '25-00441', NULL, NULL, NULL, 'BSBA-Marketing', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(855, '25-00452', 'Alumni', '25-00452', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(856, '25-00459', 'Alumni', '25-00459', NULL, NULL, NULL, 'BSIT', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(857, '25-00464', 'Alumni', '25-00464', NULL, NULL, NULL, 'BSA', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(858, '25-00466', 'Alumni', '25-00466', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(859, '25-00482', 'Alumni', '25-00482', NULL, NULL, NULL, 'BSEd-Filipino', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(860, '25-00484', 'Alumni', '25-00484', NULL, NULL, NULL, 'BSA', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(861, '25-00485', 'Alumni', '25-00485', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(862, '25-00496', 'Alumni', '25-00496', NULL, NULL, NULL, 'BSEd-English', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(863, '25-00500', 'Alumni', '25-00500', NULL, NULL, NULL, 'BSCS', 2023, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(864, '25-00025', 'Alumni', '25-00025', NULL, NULL, NULL, 'BSBA-Marketing', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(865, '25-00029', 'Alumni', '25-00029', NULL, NULL, NULL, 'BSEd-English', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(866, '25-00033', 'Alumni', '25-00033', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(867, '25-00034', 'Alumni', '25-00034', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(868, '25-00038', 'Alumni', '25-00038', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(869, '25-00039', 'Alumni', '25-00039', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(870, '25-00042', 'Alumni', '25-00042', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(871, '25-00048', 'Alumni', '25-00048', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(872, '25-00051', 'Alumni', '25-00051', NULL, NULL, NULL, 'BSA', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(873, '25-00052', 'Alumni', '25-00052', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(874, '25-00062', 'Alumni', '25-00062', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(875, '25-00063', 'Alumni', '25-00063', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(876, '25-00070', 'Alumni', '25-00070', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(877, '25-00083', 'Alumni', '25-00083', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(878, '25-00089', 'Alumni', '25-00089', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(879, '25-00091', 'Alumni', '25-00091', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(880, '25-00096', 'Alumni', '25-00096', NULL, NULL, NULL, 'BSBA-Marketing', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(881, '25-00104', 'Alumni', '25-00104', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(882, '25-00109', 'Alumni', '25-00109', NULL, NULL, NULL, 'BSEd-English', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(883, '25-00113', 'Alumni', '25-00113', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(884, '25-00123', 'Alumni', '25-00123', NULL, NULL, NULL, 'BSEd-Filipino', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(885, '25-00126', 'Alumni', '25-00126', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(886, '25-00128', 'Alumni', '25-00128', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(887, '25-00131', 'Alumni', '25-00131', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(888, '25-00137', 'Alumni', '25-00137', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(889, '25-00143', 'Alumni', '25-00143', NULL, NULL, NULL, 'BSBA-Marketing', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(890, '25-00145', 'Alumni', '25-00145', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(891, '25-00153', 'Alumni', '25-00153', NULL, NULL, NULL, 'BSBA-Marketing', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(892, '25-00154', 'Alumni', '25-00154', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(893, '25-00181', 'Alumni', '25-00181', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(894, '25-00194', 'Alumni', '25-00194', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(895, '25-00200', 'Alumni', '25-00200', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(896, '25-00204', 'Alumni', '25-00204', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(897, '25-00217', 'Alumni', '25-00217', NULL, NULL, NULL, 'BSA', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(898, '25-00223', 'Alumni', '25-00223', NULL, NULL, NULL, 'BSBA-Marketing', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(899, '25-00234', 'Alumni', '25-00234', NULL, NULL, NULL, 'BSBA-Marketing', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(900, '25-00240', 'Alumni', '25-00240', NULL, NULL, NULL, 'BSA', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(901, '25-00243', 'Alumni', '25-00243', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(902, '25-00250', 'Alumni', '25-00250', NULL, NULL, NULL, 'BSEd-English', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(903, '25-00251', 'Alumni', '25-00251', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(904, '25-00252', 'Alumni', '25-00252', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(905, '25-00264', 'Alumni', '25-00264', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(906, '25-00273', 'Alumni', '25-00273', NULL, NULL, NULL, 'BSA', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(907, '25-00281', 'Alumni', '25-00281', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(908, '25-00282', 'Alumni', '25-00282', NULL, NULL, NULL, 'BSEd-English', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(909, '25-00299', 'Alumni', '25-00299', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(910, '25-00306', 'Alumni', '25-00306', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(911, '25-00307', 'Alumni', '25-00307', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(912, '25-00314', 'Alumni', '25-00314', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(913, '25-00319', 'Alumni', '25-00319', NULL, NULL, NULL, 'BSEd-English', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(914, '25-00321', 'Alumni', '25-00321', NULL, NULL, NULL, 'BSBA-Entrepreneurship', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(915, '25-00329', 'Alumni', '25-00329', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(916, '25-00330', 'Alumni', '25-00330', NULL, NULL, NULL, 'BSA', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(917, '25-00333', 'Alumni', '25-00333', NULL, NULL, NULL, 'BSEd-English', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(918, '25-00341', 'Alumni', '25-00341', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(919, '25-00347', 'Alumni', '25-00347', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(920, '25-00355', 'Alumni', '25-00355', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(921, '25-00370', 'Alumni', '25-00370', NULL, NULL, NULL, 'BSEd-English', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(922, '25-00376', 'Alumni', '25-00376', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(923, '25-00380', 'Alumni', '25-00380', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(924, '25-00382', 'Alumni', '25-00382', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(925, '25-00387', 'Alumni', '25-00387', NULL, NULL, NULL, 'BSA', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(926, '25-00392', 'Alumni', '25-00392', NULL, NULL, NULL, 'BSA', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(927, '25-00416', 'Alumni', '25-00416', NULL, NULL, NULL, 'BSEd-English', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(928, '25-00418', 'Alumni', '25-00418', NULL, NULL, NULL, 'BSEd-Filipino', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(929, '25-00426', 'Alumni', '25-00426', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(930, '25-00429', 'Alumni', '25-00429', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(931, '25-00432', 'Alumni', '25-00432', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(932, '25-00448', 'Alumni', '25-00448', NULL, NULL, NULL, 'BSA', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(933, '25-00453', 'Alumni', '25-00453', NULL, NULL, NULL, 'BSA', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(934, '25-00455', 'Alumni', '25-00455', NULL, NULL, NULL, 'BSBA-Marketing', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(935, '25-00468', 'Alumni', '25-00468', NULL, NULL, NULL, 'BSIT', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(936, '25-00469', 'Alumni', '25-00469', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(937, '25-00470', 'Alumni', '25-00470', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(938, '25-00481', 'Alumni', '25-00481', NULL, NULL, NULL, 'BSCS', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL),
(939, '25-00486', 'Alumni', '25-00486', NULL, NULL, NULL, 'BSBA-Marketing', 2024, 'graduated', 'completed', NULL, '2026-04-09 15:52:50', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `colleges`
--

CREATE TABLE `colleges` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `program_prefix` varchar(20) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `colleges`
--

INSERT INTO `colleges` (`id`, `name`, `code`, `description`, `created_at`, `program_prefix`, `is_active`) VALUES
(6, 'College of Computer Science', 'CCS', 'Imported from Excel', '2026-03-14 07:37:45', NULL, 1),
(7, 'College of Business and Accountancy', 'CBA', 'Imported from Excel', '2026-03-14 07:37:45', NULL, 1),
(8, 'College of Arts and Sciences', 'CAS', 'Imported from Excel', '2026-03-14 07:37:45', NULL, 1),
(9, 'College of Nursing', 'CON', 'Imported from Excel', '2026-03-14 07:37:45', NULL, 1),
(10, 'College of Engineering', 'COE', 'Imported from Excel', '2026-03-14 07:37:45', NULL, 1),
(11, 'College of International Hospitality Management', 'CIHM', 'Imported from Excel', '2026-03-14 07:37:45', NULL, 1),
(12, 'College of Education', 'COED', 'Imported from Excel', '2026-03-14 07:37:45', NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `employment_records`
--

CREATE TABLE `employment_records` (
  `id` int(11) NOT NULL,
  `student_id` varchar(20) NOT NULL,
  `status` enum('Employed','Unemployed','Self-Employed','Freelancer','Further Studies') NOT NULL,
  `company` varchar(100) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `industry` varchar(50) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `monthly_income` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employment_records`
--

INSERT INTO `employment_records` (`id`, `student_id`, `status`, `company`, `position`, `industry`, `start_date`, `monthly_income`, `created_at`, `updated_at`) VALUES
(1, '23-00201', 'Employed', 'Accenture', 'Junior Data Encoder', 'Technology', '2025-08-20', 25000.00, '2026-03-14 10:07:30', '2026-03-14 10:07:30'),
(2, '25-00006', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(3, '25-00012', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(4, '25-00026', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(5, '25-00028', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(6, '25-00030', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(7, '25-00032', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(8, '25-00043', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(9, '25-00044', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(10, '25-00058', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(11, '25-00065', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(12, '25-00072', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(13, '25-00073', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(14, '25-00074', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(15, '25-00092', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(16, '25-00093', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(17, '25-00095', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(18, '25-00099', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(19, '25-00100', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(20, '25-00105', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(21, '25-00106', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(22, '25-00119', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(23, '25-00124', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(24, '25-00140', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(25, '25-00156', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(26, '25-00160', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(27, '25-00165', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(28, '25-00175', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(29, '25-00179', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(30, '25-00184', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(31, '25-00189', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(32, '25-00218', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(33, '25-00229', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(34, '25-00235', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(35, '25-00259', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(36, '25-00270', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(37, '25-00274', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(38, '25-00290', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(39, '25-00291', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(40, '25-00301', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(41, '25-00302', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(42, '25-00309', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(43, '25-00325', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(44, '25-00328', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(45, '25-00332', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(46, '25-00335', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(47, '25-00338', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(48, '25-00354', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(49, '25-00356', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(50, '25-00358', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(51, '25-00361', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(52, '25-00362', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(53, '25-00367', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(54, '25-00368', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(55, '25-00378', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(56, '25-00388', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(57, '25-00394', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(58, '25-00409', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(59, '25-00415', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(60, '25-00417', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(61, '25-00430', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(62, '25-00439', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(63, '25-00442', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(64, '25-00449', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(65, '25-00450', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(66, '25-00473', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(67, '25-00480', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(68, '25-00487', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(69, '25-00489', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(70, '25-00491', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(71, '25-00497', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(72, '25-00498', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(73, '25-00004', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(74, '25-00005', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(75, '25-00007', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(76, '25-00013', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(77, '25-00014', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(78, '25-00017', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(79, '25-00020', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(80, '25-00021', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(81, '25-00023', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(82, '25-00024', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(83, '25-00045', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(84, '25-00055', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(85, '25-00057', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(86, '25-00075', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(87, '25-00077', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(88, '25-00087', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(89, '25-00088', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(90, '25-00107', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(91, '25-00112', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(92, '25-00114', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(93, '25-00122', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(94, '25-00139', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(95, '25-00163', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(96, '25-00164', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(97, '25-00167', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(98, '25-00191', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(99, '25-00196', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(100, '25-00197', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(101, '25-00202', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(102, '25-00210', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(103, '25-00212', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(104, '25-00220', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(105, '25-00222', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(106, '25-00231', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(107, '25-00238', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(108, '25-00241', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(109, '25-00242', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(110, '25-00256', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(111, '25-00260', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(112, '25-00271', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(113, '25-00283', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(114, '25-00296', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(115, '25-00300', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(116, '25-00316', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(117, '25-00326', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(118, '25-00336', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(119, '25-00337', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(120, '25-00365', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(121, '25-00369', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(122, '25-00379', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(123, '25-00395', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(124, '25-00401', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(125, '25-00403', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(126, '25-00408', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(127, '25-00411', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(128, '25-00427', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(129, '25-00431', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(130, '25-00460', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(131, '25-00462', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(132, '25-00479', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(133, '25-00490', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(134, '25-00493', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(135, '25-00495', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(136, '25-00001', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(137, '25-00010', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(138, '25-00019', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(139, '25-00035', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(140, '25-00059', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(141, '25-00084', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(142, '25-00086', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(143, '25-00094', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(144, '25-00101', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(145, '25-00102', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(146, '25-00108', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(147, '25-00110', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(148, '25-00111', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(149, '25-00121', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(150, '25-00134', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(151, '25-00151', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(152, '25-00168', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(153, '25-00172', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(154, '25-00180', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(155, '25-00221', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(156, '25-00225', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(157, '25-00233', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(158, '25-00245', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(159, '25-00248', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(160, '25-00249', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(161, '25-00253', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(162, '25-00254', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(163, '25-00261', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(164, '25-00265', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(165, '25-00266', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(166, '25-00272', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(167, '25-00277', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(168, '25-00280', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(169, '25-00284', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(170, '25-00285', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(171, '25-00287', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(172, '25-00304', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(173, '25-00315', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(174, '25-00317', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(175, '25-00334', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(176, '25-00340', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(177, '25-00343', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(178, '25-00353', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(179, '25-00359', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(180, '25-00373', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(181, '25-00385', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(182, '25-00386', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(183, '25-00389', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(184, '25-00391', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(185, '25-00397', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(186, '25-00398', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(187, '25-00414', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(188, '25-00424', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(189, '25-00428', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(190, '25-00444', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(191, '25-00445', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(192, '25-00446', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(193, '25-00454', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(194, '25-00456', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(195, '25-00461', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(196, '25-00463', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(197, '25-00478', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(198, '25-00483', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(199, '25-00492', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(200, '25-00499', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(201, '25-00008', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(202, '25-00009', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(203, '25-00011', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(204, '25-00031', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(205, '25-00040', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(206, '25-00053', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(207, '25-00061', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(208, '25-00068', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(209, '25-00071', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(210, '25-00076', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(211, '25-00103', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(212, '25-00115', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(213, '25-00117', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(214, '25-00118', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(215, '25-00120', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(216, '25-00125', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(217, '25-00127', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(218, '25-00133', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(219, '25-00155', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(220, '25-00161', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(221, '25-00170', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(222, '25-00183', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(223, '25-00190', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(224, '25-00195', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(225, '25-00206', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(226, '25-00207', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(227, '25-00214', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(228, '25-00216', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(229, '25-00230', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(230, '25-00246', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(231, '25-00247', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(232, '25-00255', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(233, '25-00258', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(234, '25-00262', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(235, '25-00263', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(236, '25-00267', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(237, '25-00275', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(238, '25-00289', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(239, '25-00293', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(240, '25-00294', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(241, '25-00297', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(242, '25-00298', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(243, '25-00310', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(244, '25-00313', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(245, '25-00323', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(246, '25-00327', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(247, '25-00344', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(248, '25-00349', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(249, '25-00350', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(250, '25-00360', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(251, '25-00364', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(252, '25-00374', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(253, '25-00375', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(254, '25-00384', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(255, '25-00390', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(256, '25-00406', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(257, '25-00407', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(258, '25-00423', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(259, '25-00425', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(260, '25-00433', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(261, '25-00435', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(262, '25-00437', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(263, '25-00447', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(264, '25-00457', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(265, '25-00002', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(266, '25-00003', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(267, '25-00015', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(268, '25-00022', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(269, '25-00036', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(270, '25-00049', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(271, '25-00050', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(272, '25-00054', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(273, '25-00056', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(274, '25-00060', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(275, '25-00066', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(276, '25-00078', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(277, '25-00079', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(278, '25-00082', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(279, '25-00085', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(280, '25-00097', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(281, '25-00129', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(282, '25-00130', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(283, '25-00132', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(284, '25-00146', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(285, '25-00147', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(286, '25-00149', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(287, '25-00150', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(288, '25-00157', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(289, '25-00158', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(290, '25-00162', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(291, '25-00169', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(292, '25-00173', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(293, '25-00174', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(294, '25-00182', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(295, '25-00185', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(296, '25-00198', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(297, '25-00203', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(298, '25-00211', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(299, '25-00226', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(300, '25-00227', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(301, '25-00228', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(302, '25-00237', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(303, '25-00239', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(304, '25-00268', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(305, '25-00269', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(306, '25-00278', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(307, '25-00292', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(308, '25-00295', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(309, '25-00303', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(310, '25-00305', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(311, '25-00308', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(312, '25-00311', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(313, '25-00318', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(314, '25-00324', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(315, '25-00348', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(316, '25-00351', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(317, '25-00357', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(318, '25-00366', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(319, '25-00377', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(320, '25-00383', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(321, '25-00393', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(322, '25-00396', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(323, '25-00400', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(324, '25-00404', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(325, '25-00410', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(326, '25-00412', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(327, '25-00413', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(328, '25-00420', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(329, '25-00421', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(330, '25-00422', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(331, '25-00434', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(332, '25-00436', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(333, '25-00440', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(334, '25-00443', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(335, '25-00451', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(336, '25-00458', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(337, '25-00465', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(338, '25-00467', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(339, '25-00471', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(340, '25-00472', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(341, '25-00474', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(342, '25-00475', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(343, '25-00476', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(344, '25-00477', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(345, '25-00488', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(346, '25-00494', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(347, '25-00016', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(348, '25-00018', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(349, '25-00027', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(350, '25-00037', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(351, '25-00041', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(352, '25-00046', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(353, '25-00047', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(354, '25-00064', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(355, '25-00067', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(356, '25-00069', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(357, '25-00080', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(358, '25-00081', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(359, '25-00090', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(360, '25-00098', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(361, '25-00116', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(362, '25-00135', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(363, '25-00136', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(364, '25-00138', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(365, '25-00141', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(366, '25-00142', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(367, '25-00144', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(368, '25-00148', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(369, '25-00152', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(370, '25-00159', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(371, '25-00166', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(372, '25-00171', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(373, '25-00176', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(374, '25-00177', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(375, '25-00178', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(376, '25-00186', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(377, '25-00187', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(378, '25-00188', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(379, '25-00192', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(380, '25-00193', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(381, '25-00199', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(382, '25-00201', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(383, '25-00205', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(384, '25-00208', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(385, '25-00209', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(386, '25-00213', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(387, '25-00215', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(388, '25-00219', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(389, '25-00224', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(390, '25-00232', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(391, '25-00236', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(392, '25-00244', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(393, '25-00257', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(394, '25-00276', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(395, '25-00279', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(396, '25-00286', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(397, '25-00288', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(398, '25-00312', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(399, '25-00320', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(400, '25-00322', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(401, '25-00331', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(402, '25-00339', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(403, '25-00342', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(404, '25-00345', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(405, '25-00346', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(406, '25-00352', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(407, '25-00363', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(408, '25-00371', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(409, '25-00372', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(410, '25-00381', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(411, '25-00399', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(412, '25-00402', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(413, '25-00405', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(414, '25-00419', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(415, '25-00438', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(416, '25-00441', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(417, '25-00452', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(418, '25-00459', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(419, '25-00464', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(420, '25-00466', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(421, '25-00482', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(422, '25-00484', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(423, '25-00485', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(424, '25-00496', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(425, '25-00500', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(426, '25-00025', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(427, '25-00029', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(428, '25-00033', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(429, '25-00034', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(430, '25-00038', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(431, '25-00039', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(432, '25-00042', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(433, '25-00048', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(434, '25-00051', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(435, '25-00052', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(436, '25-00062', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(437, '25-00063', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(438, '25-00070', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(439, '25-00083', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(440, '25-00089', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(441, '25-00091', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(442, '25-00096', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(443, '25-00104', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(444, '25-00109', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(445, '25-00113', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(446, '25-00123', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(447, '25-00126', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(448, '25-00128', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(449, '25-00131', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(450, '25-00137', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(451, '25-00143', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(452, '25-00145', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(453, '25-00153', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(454, '25-00154', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(455, '25-00181', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(456, '25-00194', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(457, '25-00200', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(458, '25-00204', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(459, '25-00217', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(460, '25-00223', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(461, '25-00234', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(462, '25-00240', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(463, '25-00243', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(464, '25-00250', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(465, '25-00251', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(466, '25-00252', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(467, '25-00264', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(468, '25-00273', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(469, '25-00281', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(470, '25-00282', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(471, '25-00299', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(472, '25-00306', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51');
INSERT INTO `employment_records` (`id`, `student_id`, `status`, `company`, `position`, `industry`, `start_date`, `monthly_income`, `created_at`, `updated_at`) VALUES
(473, '25-00307', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(474, '25-00314', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(475, '25-00319', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(476, '25-00321', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(477, '25-00329', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(478, '25-00330', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(479, '25-00333', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(480, '25-00341', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(481, '25-00347', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(482, '25-00355', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(483, '25-00370', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(484, '25-00376', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(485, '25-00380', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(486, '25-00382', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(487, '25-00387', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(488, '25-00392', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(489, '25-00416', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(490, '25-00418', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(491, '25-00426', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(492, '25-00429', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(493, '25-00432', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(494, '25-00448', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(495, '25-00453', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(496, '25-00455', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(497, '25-00468', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(498, '25-00469', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(499, '25-00470', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(500, '25-00481', 'Employed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51'),
(501, '25-00486', 'Unemployed', NULL, NULL, NULL, NULL, NULL, '2026-04-09 15:52:51', '2026-04-09 15:52:51');

-- --------------------------------------------------------

--
-- Table structure for table `import_errors`
--

CREATE TABLE `import_errors` (
  `id` int(11) NOT NULL,
  `import_id` int(11) NOT NULL,
  `row_number` int(11) NOT NULL,
  `error` text NOT NULL,
  `raw_data` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `import_errors`
--

INSERT INTO `import_errors` (`id`, `import_id`, `row_number`, `error`, `raw_data`) VALUES
(14, 7, 23, 'Duplicate entry \'BS_BUSINESS_ADMINIST\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00203\",\"First Name\":\"Vivienne\",\"Last Name\":\"Castillo\",\"Middle Name\":\"Bonifacio\",\"College\":\"College of Business and Accountancy\",\"Code\":\"CBA\",\"Program\":\"BS Business Administration major in Financial Management\",\"Batch Year\":2027,\"Email\":\"vivienne.castillo@plpasig.edu.ph\",\"_sheet\":\"CBA\"}'),
(15, 7, 25, 'Duplicate entry \'BS_BUSINESS_ADMINIST\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00205\",\"First Name\":\"Enzo\",\"Last Name\":\"Ortega\",\"Middle Name\":\"Umali\",\"College\":\"College of Business and Accountancy\",\"Code\":\"CBA\",\"Program\":\"BS Business Administration major in Financial Management\",\"Batch Year\":2027,\"Email\":\"enzo.ortega@plpasig.edu.ph\",\"_sheet\":\"CBA\"}'),
(16, 7, 26, 'Duplicate entry \'BS_BUSINESS_ADMINIST\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00206\",\"First Name\":\"Tristan\",\"Last Name\":\"Salazar\",\"Middle Name\":\"Aguilar\",\"College\":\"College of Business and Accountancy\",\"Code\":\"CBA\",\"Program\":\"BS Business Administration major in Financial Management\",\"Batch Year\":2027,\"Email\":\"tristan.salazar@plpasig.edu.ph\",\"_sheet\":\"CBA\"}'),
(17, 7, 30, 'Duplicate entry \'BS_BUSINESS_ADMINIST\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00210\",\"First Name\":\"Jasmine\",\"Last Name\":\"Luna\",\"Middle Name\":\"Umali\",\"College\":\"College of Business and Accountancy\",\"Code\":\"CBA\",\"Program\":\"BS Business Administration major in Financial Management\",\"Batch Year\":2027,\"Email\":\"jasmine.luna@plpasig.edu.ph\",\"_sheet\":\"CBA\"}'),
(18, 7, 34, 'Duplicate entry \'BS_BUSINESS_ADMINIST\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00214\",\"First Name\":\"Janelle\",\"Last Name\":\"Torres\",\"Middle Name\":\"Serrano\",\"College\":\"College of Business and Accountancy\",\"Code\":\"CBA\",\"Program\":\"BS Business Administration major in Financial Management\",\"Batch Year\":2027,\"Email\":\"janelle.torres@plpasig.edu.ph\",\"_sheet\":\"CBA\"}'),
(19, 7, 35, 'Duplicate entry \'BS_BUSINESS_ADMINIST\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00215\",\"First Name\":\"Vince\",\"Last Name\":\"Domingo\",\"Middle Name\":\"Ocampo\",\"Suffix\":\"III\",\"College\":\"College of Business and Accountancy\",\"Code\":\"CBA\",\"Program\":\"BS Business Administration major in Financial Management\",\"Batch Year\":2027,\"Email\":\"vince.domingo@plpasig.edu.ph\",\"_sheet\":\"CBA\"}'),
(20, 7, 125, 'Duplicate entry \'BACHELOR_OF_SECONDAR\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00305\",\"First Name\":\"Jerome\",\"Last Name\":\"Dela Cruz\",\"Middle Name\":\"Bonifacio\",\"College\":\"College of Education\",\"Code\":\"COED\",\"Program\":\"Bachelor of Secondary Education major in Filipino\",\"Batch Year\":2027,\"Email\":\"jerome.delacruz@plpasig.edu.ph\",\"_sheet\":\"COED\"}'),
(21, 7, 131, 'Duplicate entry \'BACHELOR_OF_SECONDAR\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00311\",\"First Name\":\"Nicole\",\"Last Name\":\"Bautista\",\"Middle Name\":\"Ferrer\",\"Suffix\":\"Jr.\",\"College\":\"College of Education\",\"Code\":\"COED\",\"Program\":\"Bachelor of Secondary Education major in Filipino\",\"Batch Year\":2027,\"Email\":\"nicole.bautista@plpasig.edu.ph\",\"_sheet\":\"COED\"}'),
(22, 7, 133, 'Duplicate entry \'BACHELOR_OF_SECONDAR\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00313\",\"First Name\":\"Bianca\",\"Last Name\":\"Mendoza\",\"Middle Name\":\"Villanueva\",\"Suffix\":\"III\",\"College\":\"College of Education\",\"Code\":\"COED\",\"Program\":\"Bachelor of Secondary Education major in Filipino\",\"Batch Year\":2027,\"Email\":\"bianca.mendoza@plpasig.edu.ph\",\"_sheet\":\"COED\"}'),
(23, 7, 135, 'Duplicate entry \'BACHELOR_OF_SECONDAR\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00315\",\"First Name\":\"Mae\",\"Last Name\":\"Navarro\",\"Middle Name\":\"Bonifacio\",\"College\":\"College of Education\",\"Code\":\"COED\",\"Program\":\"Bachelor of Secondary Education major in Filipino\",\"Batch Year\":2027,\"Email\":\"mae.navarro@plpasig.edu.ph\",\"_sheet\":\"COED\"}'),
(24, 7, 136, 'Duplicate entry \'BACHELOR_OF_SECONDAR\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00316\",\"First Name\":\"Nathaniel\",\"Last Name\":\"Reyes\",\"Middle Name\":\"Cordero\",\"College\":\"College of Education\",\"Code\":\"COED\",\"Program\":\"Bachelor of Secondary Education major in Filipino\",\"Batch Year\":2027,\"Email\":\"nathaniel.reyes@plpasig.edu.ph\",\"_sheet\":\"COED\"}'),
(25, 7, 139, 'Duplicate entry \'BACHELOR_OF_SECONDAR\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00319\",\"First Name\":\"Karl\",\"Last Name\":\"Salazar\",\"Middle Name\":\"Rizal\",\"College\":\"College of Education\",\"Code\":\"COED\",\"Program\":\"Bachelor of Secondary Education major in English\",\"Batch Year\":2027,\"Email\":\"karl.salazar@plpasig.edu.ph\",\"_sheet\":\"COED\"}'),
(26, 7, 140, 'Duplicate entry \'BACHELOR_OF_SECONDAR\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00320\",\"First Name\":\"Joshua\",\"Last Name\":\"Torres\",\"Middle Name\":\"Cordero\",\"College\":\"College of Education\",\"Code\":\"COED\",\"Program\":\"Bachelor of Secondary Education major in English\",\"Batch Year\":2027,\"Email\":\"joshua.torres@plpasig.edu.ph\",\"_sheet\":\"COED\"}'),
(27, 8, 23, 'Duplicate entry \'BS_BUSINESS_ADMINIST\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00203\",\"First Name\":\"Vivienne\",\"Last Name\":\"Castillo\",\"Middle Name\":\"Bonifacio\",\"College\":\"College of Business and Accountancy\",\"Code\":\"CBA\",\"Program\":\"BS Business Administration major in Financial Management\",\"Batch Year\":2027,\"Email\":\"vivienne.castillo@plpasig.edu.ph\",\"_sheet\":\"CBA\"}'),
(28, 8, 25, 'Duplicate entry \'BS_BUSINESS_ADMINIST\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00205\",\"First Name\":\"Enzo\",\"Last Name\":\"Ortega\",\"Middle Name\":\"Umali\",\"College\":\"College of Business and Accountancy\",\"Code\":\"CBA\",\"Program\":\"BS Business Administration major in Financial Management\",\"Batch Year\":2027,\"Email\":\"enzo.ortega@plpasig.edu.ph\",\"_sheet\":\"CBA\"}'),
(29, 8, 26, 'Duplicate entry \'BS_BUSINESS_ADMINIST\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00206\",\"First Name\":\"Tristan\",\"Last Name\":\"Salazar\",\"Middle Name\":\"Aguilar\",\"College\":\"College of Business and Accountancy\",\"Code\":\"CBA\",\"Program\":\"BS Business Administration major in Financial Management\",\"Batch Year\":2027,\"Email\":\"tristan.salazar@plpasig.edu.ph\",\"_sheet\":\"CBA\"}'),
(30, 8, 30, 'Duplicate entry \'BS_BUSINESS_ADMINIST\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00210\",\"First Name\":\"Jasmine\",\"Last Name\":\"Luna\",\"Middle Name\":\"Umali\",\"College\":\"College of Business and Accountancy\",\"Code\":\"CBA\",\"Program\":\"BS Business Administration major in Financial Management\",\"Batch Year\":2027,\"Email\":\"jasmine.luna@plpasig.edu.ph\",\"_sheet\":\"CBA\"}'),
(31, 8, 34, 'Duplicate entry \'BS_BUSINESS_ADMINIST\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00214\",\"First Name\":\"Janelle\",\"Last Name\":\"Torres\",\"Middle Name\":\"Serrano\",\"College\":\"College of Business and Accountancy\",\"Code\":\"CBA\",\"Program\":\"BS Business Administration major in Financial Management\",\"Batch Year\":2027,\"Email\":\"janelle.torres@plpasig.edu.ph\",\"_sheet\":\"CBA\"}'),
(32, 8, 35, 'Duplicate entry \'BS_BUSINESS_ADMINIST\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00215\",\"First Name\":\"Vince\",\"Last Name\":\"Domingo\",\"Middle Name\":\"Ocampo\",\"Suffix\":\"III\",\"College\":\"College of Business and Accountancy\",\"Code\":\"CBA\",\"Program\":\"BS Business Administration major in Financial Management\",\"Batch Year\":2027,\"Email\":\"vince.domingo@plpasig.edu.ph\",\"_sheet\":\"CBA\"}'),
(33, 8, 125, 'Duplicate entry \'BACHELOR_OF_SECONDAR\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00305\",\"First Name\":\"Jerome\",\"Last Name\":\"Dela Cruz\",\"Middle Name\":\"Bonifacio\",\"College\":\"College of Education\",\"Code\":\"COED\",\"Program\":\"Bachelor of Secondary Education major in Filipino\",\"Batch Year\":2027,\"Email\":\"jerome.delacruz@plpasig.edu.ph\",\"_sheet\":\"COED\"}'),
(34, 8, 131, 'Duplicate entry \'BACHELOR_OF_SECONDAR\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00311\",\"First Name\":\"Nicole\",\"Last Name\":\"Bautista\",\"Middle Name\":\"Ferrer\",\"Suffix\":\"Jr.\",\"College\":\"College of Education\",\"Code\":\"COED\",\"Program\":\"Bachelor of Secondary Education major in Filipino\",\"Batch Year\":2027,\"Email\":\"nicole.bautista@plpasig.edu.ph\",\"_sheet\":\"COED\"}'),
(35, 8, 133, 'Duplicate entry \'BACHELOR_OF_SECONDAR\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00313\",\"First Name\":\"Bianca\",\"Last Name\":\"Mendoza\",\"Middle Name\":\"Villanueva\",\"Suffix\":\"III\",\"College\":\"College of Education\",\"Code\":\"COED\",\"Program\":\"Bachelor of Secondary Education major in Filipino\",\"Batch Year\":2027,\"Email\":\"bianca.mendoza@plpasig.edu.ph\",\"_sheet\":\"COED\"}'),
(36, 8, 135, 'Duplicate entry \'BACHELOR_OF_SECONDAR\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00315\",\"First Name\":\"Mae\",\"Last Name\":\"Navarro\",\"Middle Name\":\"Bonifacio\",\"College\":\"College of Education\",\"Code\":\"COED\",\"Program\":\"Bachelor of Secondary Education major in Filipino\",\"Batch Year\":2027,\"Email\":\"mae.navarro@plpasig.edu.ph\",\"_sheet\":\"COED\"}'),
(37, 8, 136, 'Duplicate entry \'BACHELOR_OF_SECONDAR\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00316\",\"First Name\":\"Nathaniel\",\"Last Name\":\"Reyes\",\"Middle Name\":\"Cordero\",\"College\":\"College of Education\",\"Code\":\"COED\",\"Program\":\"Bachelor of Secondary Education major in Filipino\",\"Batch Year\":2027,\"Email\":\"nathaniel.reyes@plpasig.edu.ph\",\"_sheet\":\"COED\"}'),
(38, 8, 139, 'Duplicate entry \'BACHELOR_OF_SECONDAR\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00319\",\"First Name\":\"Karl\",\"Last Name\":\"Salazar\",\"Middle Name\":\"Rizal\",\"College\":\"College of Education\",\"Code\":\"COED\",\"Program\":\"Bachelor of Secondary Education major in English\",\"Batch Year\":2027,\"Email\":\"karl.salazar@plpasig.edu.ph\",\"_sheet\":\"COED\"}'),
(39, 8, 140, 'Duplicate entry \'BACHELOR_OF_SECONDAR\' for key \'unique_program_code\'', '{\"Student ID\":\"24-00320\",\"First Name\":\"Joshua\",\"Last Name\":\"Torres\",\"Middle Name\":\"Cordero\",\"College\":\"College of Education\",\"Code\":\"COED\",\"Program\":\"Bachelor of Secondary Education major in English\",\"Batch Year\":2027,\"Email\":\"joshua.torres@plpasig.edu.ph\",\"_sheet\":\"COED\"}');

-- --------------------------------------------------------

--
-- Table structure for table `import_history`
--

CREATE TABLE `import_history` (
  `id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `uploaded_by` int(11) DEFAULT NULL,
  `total_records` int(11) NOT NULL,
  `success_count` int(11) NOT NULL,
  `failed_count` int(11) NOT NULL,
  `status` enum('completed','partial','failed') DEFAULT 'completed'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `import_history`
--

INSERT INTO `import_history` (`id`, `filename`, `uploaded_at`, `uploaded_by`, `total_records`, `success_count`, `failed_count`, `status`) VALUES
(7, 'Batch_2024_Colleges (1).xlsx', '2026-03-14 08:36:53', 1, 140, 127, 13, 'partial'),
(8, 'Batch_2024_Colleges (2).xlsx', '2026-03-14 08:40:59', 1, 140, 127, 13, 'partial');

-- --------------------------------------------------------

--
-- Table structure for table `programs`
--

CREATE TABLE `programs` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) NOT NULL,
  `college_id` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `programs`
--

INSERT INTO `programs` (`id`, `name`, `code`, `college_id`, `description`, `is_active`, `created_at`) VALUES
(33, 'BS Computer Science', 'BS_COMPUTER_SCIENCE', 6, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(34, 'BS Information Technology', 'BS_INFORMATION_TECHN', 6, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(35, 'BS Information Systems', 'BS_INFORMATION_SYSTE', 6, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(36, 'BS Entrepreneurship', 'BS_ENTREPRENEURSHIP', 7, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(37, 'BS Business Administration major in Marketing Management', 'BS_BUSINESS_ADMINIST', 7, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(39, 'BS Accountancy', 'BS_ACCOUNTANCY', 7, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(45, 'BS Biology', 'BS_BIOLOGY', 8, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(46, 'BS Psychology', 'BS_PSYCHOLOGY', 8, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(47, 'BA Communication', 'BA_COMMUNICATION', 8, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(48, 'BS Mathematics', 'BS_MATHEMATICS', 8, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(49, 'BS Nursing', 'BS_NURSING', 9, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(50, 'BS Electrical Engineering', 'BS_ELECTRICAL_ENGINE', 10, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(51, 'BS Computer Engineering', 'BS_COMPUTER_ENGINEER', 10, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(52, 'BS Civil Engineering', 'BS_CIVIL_ENGINEERING', 10, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(53, 'BS Mechanical Engineering', 'BS_MECHANICAL_ENGINE', 10, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(54, 'BS Hospitality Management', 'BS_HOSPITALITY_MANAG', 11, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(55, 'BS Tourism Management', 'BS_TOURISM_MANAGEMEN', 11, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(56, 'Bachelor of Elementary Education', 'BACHELOR_OF_ELEMENTA', 12, 'Imported from Excel', 1, '2026-03-14 07:37:45'),
(57, 'Bachelor of Secondary Education major in Mathematics', 'BACHELOR_OF_SECONDAR', 12, 'Imported from Excel', 1, '2026-03-14 07:37:45');

-- --------------------------------------------------------

--
-- Table structure for table `published_surveys`
--

CREATE TABLE `published_surveys` (
  `id` int(11) NOT NULL,
  `college_id` int(11) NOT NULL,
  `version` int(11) NOT NULL,
  `published_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `published_by` int(11) NOT NULL,
  `status` enum('active','archived') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_answers`
--

CREATE TABLE `survey_answers` (
  `id` int(11) NOT NULL,
  `response_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `answer_text` text DEFAULT NULL,
  `answer_options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`answer_options`)),
  `answer_number` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_categories`
--

CREATE TABLE `survey_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `order_index` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_questions`
--

CREATE TABLE `survey_questions` (
  `id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `text` text NOT NULL,
  `type` enum('text','select','dropdown','checkbox','scale','number') NOT NULL,
  `required` tinyint(1) DEFAULT 1,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`)),
  `scale_min` int(11) DEFAULT NULL,
  `scale_max` int(11) DEFAULT NULL,
  `order_index` int(11) NOT NULL,
  `version` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `colleges` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`colleges`)),
  `programs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`programs`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_responses`
--

CREATE TABLE `survey_responses` (
  `id` int(11) NOT NULL,
  `student_id` varchar(20) NOT NULL,
  `survey_version` int(11) NOT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `status` enum('in_progress','completed','abandoned') DEFAULT 'in_progress',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_versions`
--

CREATE TABLE `survey_versions` (
  `id` int(11) NOT NULL,
  `version_number` int(11) NOT NULL,
  `published` tinyint(1) DEFAULT 0,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(50) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','alumni') NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `suffix` varchar(10) DEFAULT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `username`, `email`, `password_hash`, `role`, `first_name`, `last_name`, `middle_name`, `suffix`, `last_login`, `created_at`, `updated_at`, `phone`, `address`) VALUES
(1, 'admin', 'admin@example.com', '$2b$10$1Kvpf1.ElPvujohkvGB11eLOkzszyP4iJSH5Js0R0E7ZEiUy6y3xi', 'admin', 'Admin', 'User', NULL, NULL, '2026-04-09 15:11:00', '2026-03-12 14:12:59', '2026-04-09 15:11:00', NULL, NULL),
(5, '23-00201', 'ynasese@gmail.com', '$2b$10$WHYl9fVXSDgJ4yLZIn5zde/6ic/HI.DohgA1.V5JEFbZljSop47QW', 'alumni', 'Liam ', 'Santos', NULL, NULL, '2026-03-14 10:24:04', '2026-03-14 08:57:34', '2026-03-14 10:24:04', '', ''),
(6, '24-00301', 'betonio_charlesjefferson@plpasig.edu.ph', '$2b$10$3vXnI97.lI8nlANwCRyeWu1d9Hevl1x7XJLF7i5Tl7hH0ueOnUZbq', 'alumni', 'Alyssa', 'Santos', 'Ferrer', 'III', '2026-03-14 10:17:34', '2026-03-14 10:15:37', '2026-03-14 10:17:34', NULL, NULL),
(7, '24-00203', 'teopaco_markjerome@plpasig.edu.ph', '$2b$10$31LUgMGKFOci.cNKKVRUl.VbIiekInvPNcPn1HGU74e7kiDpKj5O2', 'alumni', 'Noah ', 'Cruz', NULL, NULL, '2026-04-09 12:19:26', '2026-04-09 12:10:58', '2026-04-09 12:19:26', NULL, NULL);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_alumni_with_programs`
-- (See below for the actual view)
--
CREATE TABLE `vw_alumni_with_programs` (
`id` int(11)
,`student_id` varchar(20)
,`first_name` varchar(50)
,`last_name` varchar(50)
,`middle_name` varchar(50)
,`suffix` varchar(10)
,`email` varchar(100)
,`program` varchar(100)
,`batch_year` int(11)
,`status` enum('active','inactive','graduated')
,`survey_status` enum('pending','completed')
,`imported_by` int(11)
,`imported_at` timestamp
,`program_id` int(11)
,`program_name` varchar(100)
,`program_code` varchar(20)
,`college_name` varchar(100)
,`college_code` varchar(20)
);

-- --------------------------------------------------------

--
-- Structure for view `vw_alumni_with_programs`
--
DROP TABLE IF EXISTS `vw_alumni_with_programs`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_alumni_with_programs`  AS SELECT `ar`.`id` AS `id`, `ar`.`student_id` AS `student_id`, `ar`.`first_name` AS `first_name`, `ar`.`last_name` AS `last_name`, `ar`.`middle_name` AS `middle_name`, `ar`.`suffix` AS `suffix`, `ar`.`email` AS `email`, `ar`.`program` AS `program`, `ar`.`batch_year` AS `batch_year`, `ar`.`status` AS `status`, `ar`.`survey_status` AS `survey_status`, `ar`.`imported_by` AS `imported_by`, `ar`.`imported_at` AS `imported_at`, `ar`.`program_id` AS `program_id`, `p`.`name` AS `program_name`, `p`.`code` AS `program_code`, `c`.`name` AS `college_name`, `c`.`code` AS `college_code` FROM ((`alumni_records` `ar` left join `programs` `p` on(`ar`.`program_id` = `p`.`id`)) left join `colleges` `c` on(`p`.`college_id` = `c`.`id`)) ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `alumni_records`
--
ALTER TABLE `alumni_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_id` (`student_id`),
  ADD KEY `imported_by` (`imported_by`),
  ADD KEY `program_id` (`program_id`);

--
-- Indexes for table `colleges`
--
ALTER TABLE `colleges`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `employment_records`
--
ALTER TABLE `employment_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`);

--
-- Indexes for table `import_errors`
--
ALTER TABLE `import_errors`
  ADD PRIMARY KEY (`id`),
  ADD KEY `import_id` (`import_id`);

--
-- Indexes for table `import_history`
--
ALTER TABLE `import_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uploaded_by` (`uploaded_by`);

--
-- Indexes for table `programs`
--
ALTER TABLE `programs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_program_code` (`code`),
  ADD KEY `college_id` (`college_id`);

--
-- Indexes for table `published_surveys`
--
ALTER TABLE `published_surveys`
  ADD PRIMARY KEY (`id`),
  ADD KEY `published_by` (`published_by`),
  ADD KEY `idx_college_status` (`college_id`,`status`),
  ADD KEY `idx_published_at` (`published_at`);

--
-- Indexes for table `survey_answers`
--
ALTER TABLE `survey_answers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `question_id` (`question_id`),
  ADD KEY `idx_response` (`response_id`);

--
-- Indexes for table `survey_categories`
--
ALTER TABLE `survey_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `survey_questions`
--
ALTER TABLE `survey_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `survey_responses`
--
ALTER TABLE `survey_responses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_student_survey` (`student_id`,`survey_version`);

--
-- Indexes for table `survey_versions`
--
ALTER TABLE `survey_versions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `version_number` (`version_number`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `alumni_records`
--
ALTER TABLE `alumni_records`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=940;

--
-- AUTO_INCREMENT for table `colleges`
--
ALTER TABLE `colleges`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `employment_records`
--
ALTER TABLE `employment_records`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=502;

--
-- AUTO_INCREMENT for table `import_errors`
--
ALTER TABLE `import_errors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `import_history`
--
ALTER TABLE `import_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `programs`
--
ALTER TABLE `programs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=91;

--
-- AUTO_INCREMENT for table `published_surveys`
--
ALTER TABLE `published_surveys`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `survey_answers`
--
ALTER TABLE `survey_answers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `survey_categories`
--
ALTER TABLE `survey_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `survey_questions`
--
ALTER TABLE `survey_questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `survey_responses`
--
ALTER TABLE `survey_responses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `survey_versions`
--
ALTER TABLE `survey_versions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `alumni_records`
--
ALTER TABLE `alumni_records`
  ADD CONSTRAINT `alumni_records_ibfk_1` FOREIGN KEY (`imported_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `alumni_records_ibfk_2` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `employment_records`
--
ALTER TABLE `employment_records`
  ADD CONSTRAINT `employment_records_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `alumni_records` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `import_errors`
--
ALTER TABLE `import_errors`
  ADD CONSTRAINT `import_errors_ibfk_1` FOREIGN KEY (`import_id`) REFERENCES `import_history` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `import_history`
--
ALTER TABLE `import_history`
  ADD CONSTRAINT `import_history_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `user` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `programs`
--
ALTER TABLE `programs`
  ADD CONSTRAINT `programs_ibfk_1` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `published_surveys`
--
ALTER TABLE `published_surveys`
  ADD CONSTRAINT `published_surveys_ibfk_1` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `published_surveys_ibfk_2` FOREIGN KEY (`published_by`) REFERENCES `user` (`id`);

--
-- Constraints for table `survey_answers`
--
ALTER TABLE `survey_answers`
  ADD CONSTRAINT `survey_answers_ibfk_1` FOREIGN KEY (`response_id`) REFERENCES `survey_responses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `survey_answers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `survey_questions` (`id`);

--
-- Constraints for table `survey_questions`
--
ALTER TABLE `survey_questions`
  ADD CONSTRAINT `survey_questions_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `survey_categories` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `survey_responses`
--
ALTER TABLE `survey_responses`
  ADD CONSTRAINT `survey_responses_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `alumni_records` (`student_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
