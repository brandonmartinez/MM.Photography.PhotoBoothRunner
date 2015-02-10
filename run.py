#!/usr/bin/python

# Imports
####################################
import os
import RPi.GPIO as GPIO
import time
import subprocess
import logging
import logging.handlers
import atexit


# Constants and Global Variables
####################################

# Resource Strings
READY_TEXT = "Ready to take photos! Press shutter to start."
POSE_TEXT = "Pose!"
SNAP_TEXT = "SNAP!"
PROCESSING_TEXT = "please wait while your photos print..."
FINISHED_PROCESSING_TEXT = "ready for next round"
QUITTING_TEXT = "Finished taking photos. Come again!"

# Subprocess Commands
GPPHOTO_COMMAND = "gphoto2 --capture-image-and-download" \
    + " --filename \"/home/pi/Pictures/Photobooth/%Y%m%d%H%M%S.jpg\""
PROCESSING_COMMAND = "sudo /home/pi/scripts/photobooth/assemble_and_print"

# GPIO Pins
SHUTTER_BUTTON = 24
SHUTTER_BUTTON_LED = 23
QUIT_BUTTON = 26
PROCESSING_LED = 22
POSING_LED = 18

# State Variables
takePhotos = True


# Shared Functions
####################################

def create_logger():
    # create logger
    logging_logger = logging.getLogger('PhotoBoothRunner')
    logging_logger.setLevel(logging.DEBUG)

    # Create logging directory if not available
    if not os.path.exists("Logs"):
        os.makedirs("Logs")

    # Create handler
    logging_handler = logging.handlers.RotatingFileHandler(
        "Logs/PhotoBoothRunner.log",
        "a",
        1048576,
        10,
        None,
        0)
    logging_handler.setLevel(logging.DEBUG)

    # create formatter
    logging_formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    # add formatter to handler
    logging_handler.setFormatter(logging_formatter)

    # add handler to logger
    logging_logger.addHandler(logging_handler)

    return logging_logger


def setup_gpio():
    logger.debug("Setting up GPIO pins")

    # Set the mode to BCM to use "Friendly" names
    GPIO.setmode(GPIO.BCM)

    # Set inputs
    GPIO.setup(SHUTTER_BUTTON, GPIO.IN)
    GPIO.setup(QUIT_BUTTON, GPIO.IN)

    # Set outputs
    GPIO.setup(POSING_LED, GPIO.OUT)
    GPIO.setup(SHUTTER_BUTTON_LED, GPIO.OUT)
    GPIO.setup(PROCESSING_LED, GPIO.OUT)

    # Set default pin assignments
    GPIO.output(SHUTTER_BUTTON_LED, True)
    GPIO.output(PROCESSING_LED, False)


def cleanup_gpio():
    logger.debug("Cleaning Up GPIO")
    GPIO.cleanup()


def take_photo():
    snap = 0

    while snap < 1:
        print(POSE_TEXT)
        GPIO.output(SHUTTER_BUTTON_LED, False)
        GPIO.output(POSING_LED, True)
        time.sleep(1.5)

        countdown = 5
        for i in range(4):
            print countdown
            GPIO.output(POSING_LED, False)
            time.sleep(0.5)
            GPIO.output(POSING_LED, True)
            time.sleep(0.5)
            countdown -= 1

        print countdown

        for i in range(5):
            GPIO.output(POSING_LED, False)
            time.sleep(0.1)
            GPIO.output(POSING_LED, True)
            time.sleep(0.1)
            GPIO.output(POSING_LED, False)

        print(SNAP_TEXT)

        attempts = 3

        while attempts > 0:
            gpout = ""
            try:
                gpout = subprocess.check_output(
                    GPPHOTO_COMMAND,
                    stderr=subprocess.STDOUT,
                    shell=True)

                logger.debug(gpout)

                if "ERROR" not in gpout:
                    GPIO.output(POSING_LED, False)
                    time.sleep(0.5)
                    print(PROCESSING_TEXT)
                    GPIO.output(PROCESSING_LED, True)
                    time.sleep(1)
                    # build image and send to printer
                    # subprocess.call(PROCESSING_COMMAND, shell=True)
                    # TODO: implement a reboot button
                    # Wait to ensure that print queue doesn't pile up
                    # TODO: check status of printer instead
                    # of using this arbitrary wait time
                    # time.sleep(110)
                    print(FINISHED_PROCESSING_TEXT)
                    GPIO.output(PROCESSING_LED, False)
                    GPIO.output(SHUTTER_BUTTON_LED, True)
                    attempts = 0
                else:
                    time.sleep(0.5)
                    attempts -= 1
            except:
                logger.error("An error occurred attempting to take photo")
                logger.error(gpout)
                time.sleep(0.5)
                attempts -= 1
                pass

        snap += 1


def quit_application():
    global takePhotos

    print QUITTING_TEXT
    takePhotos = False

# Main Application
####################################

# Setup logging
logger = create_logger()

# Register our cleanup process
atexit.register(cleanup_gpio)

# Configure the GPIO
setup_gpio()

print READY_TEXT
while (takePhotos is True):
    try:
        if(GPIO.input(QUIT_BUTTON)):
            quit_application()
        if (GPIO.input(SHUTTER_BUTTON)):
            take_photo()
    except:
        logger.error("An unexpected error occurred")
        pass
